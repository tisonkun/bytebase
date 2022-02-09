package sqlite

import (
	"bufio"
	"context"
	"database/sql"
	"fmt"
	"io"
	"io/ioutil"
	"path"
	"strings"

	// embed will embeds the migration schema.
	_ "embed"

	"github.com/bytebase/bytebase/common"
	"github.com/bytebase/bytebase/plugin/db"
	"github.com/bytebase/bytebase/plugin/db/util"
	"go.uber.org/zap"
)

//go:embed sqlite_migration_schema.sql
var migrationSchema string

var (
	bytebaseDatabase     = "bytebase"
	excludedDatabaseList = map[string]bool{
		// Skip our internal "bytebase" database
		bytebaseDatabase: true,
	}

	_ db.Driver              = (*Driver)(nil)
	_ util.MigrationExecutor = (*Driver)(nil)
)

func init() {
	db.Register(db.SQLite, newDriver)
}

// Driver is the SQLite driver.
type Driver struct {
	dir           string
	db            *sql.DB
	connectionCtx db.ConnectionContext
	l             *zap.Logger
}

func newDriver(config db.DriverConfig) db.Driver {
	return &Driver{
		l: config.Logger,
	}
}

// Open opens a SQLite driver.
func (driver *Driver) Open(ctx context.Context, dbType db.Type, config db.ConnectionConfig, connCtx db.ConnectionContext) (db.Driver, error) {
	// Host is the directory (instance) containing all SQLite databases.
	driver.dir = config.Host

	// If config.Database is empty, we will get a connection to in-memory database.
	if _, err := driver.GetDbConnection(ctx, config.Database); err != nil {
		return nil, err
	}
	driver.connectionCtx = connCtx
	return driver, nil
}

// Close closes the driver.
func (driver *Driver) Close(ctx context.Context) error {
	if driver.db != nil {
		return driver.db.Close()
	}
	return nil
}

// Ping pings the database.
func (driver *Driver) Ping(ctx context.Context) error {
	return driver.db.PingContext(ctx)
}

// GetDbConnection gets a database connection.
// If database is empty, we will get a connect to in-memory database.
func (driver *Driver) GetDbConnection(ctx context.Context, database string) (*sql.DB, error) {
	if driver.db != nil {
		if err := driver.db.Close(); err != nil {
			return nil, err
		}
	}

	dns := path.Join(driver.dir, fmt.Sprintf("%s.db", database))
	if database == "" {
		dns = ":memory:"
	}
	db, err := sql.Open("sqlite3", dns)
	if err != nil {
		return nil, err
	}
	driver.db = db
	return db, nil
}

// GetVersion gets the version.
func (driver *Driver) GetVersion(ctx context.Context) (string, error) {
	var version string
	row := driver.db.QueryRowContext(ctx, "SELECT sqlite_version();")
	if err := row.Scan(&version); err != nil {
		return "", err
	}
	return version, nil
}

// SyncSchema synces the schema.
func (driver *Driver) SyncSchema(ctx context.Context) ([]*db.User, []*db.Schema, error) {
	databases, err := driver.getDatabases()
	if err != nil {
		return nil, nil, err
	}

	var schemaList []*db.Schema
	for _, dbName := range databases {
		if _, ok := excludedDatabaseList[dbName]; ok {
			continue
		}

		var schema db.Schema
		schema.Name = dbName
		// TODO(d-bytebase): retrieve database schema such as tables and indices.
		schemaList = append(schemaList, &schema)
	}
	return nil, schemaList, nil
}

func (driver *Driver) getDatabases() ([]string, error) {
	files, err := ioutil.ReadDir(driver.dir)
	if err != nil {
		return nil, fmt.Errorf("failed to read directory %q, error %w", driver.dir, err)
	}
	var databases []string
	for _, file := range files {
		if file.IsDir() || !strings.HasSuffix(file.Name(), ".db") {
			continue
		}
		databases = append(databases, strings.TrimRight(file.Name(), ".db"))
	}
	return databases, nil
}

func (driver *Driver) hasBytebaseDatabase() (bool, error) {
	databases, err := driver.getDatabases()
	if err != nil {
		return false, err
	}
	for _, database := range databases {
		if database == bytebaseDatabase {
			return true, nil
		}
	}
	return false, nil
}

// Execute executes a SQL statement.
func (driver *Driver) Execute(ctx context.Context, statement string, useTransaction bool) error {
	// This is a fake CREATA DATABASE statement. Engine driver will recognize it and establish a connect to create the database.
	if strings.HasPrefix(statement, "CREATE DATABASE ") {
		parts := strings.Split(statement, `'`)
		if len(parts) != 3 {
			return fmt.Errorf("invalid statement %q", statement)
		}
		db, err := driver.GetDbConnection(ctx, parts[1])
		if err != nil {
			return err
		}
		// We need to query to persist the database file.
		if _, err := db.Query("SELECT 1;"); err != nil {
			return err
		}
		return nil
	}

	tx, err := driver.db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer tx.Rollback()

	_, err = tx.ExecContext(ctx, statement)

	if err == nil {
		if err := tx.Commit(); err != nil {
			return err
		}
	}

	return err
}

// Query queries a SQL statement.
func (driver *Driver) Query(ctx context.Context, statement string, limit int) ([]interface{}, error) {
	return util.Query(ctx, driver.l, driver.db, statement, limit)
}

// NeedsSetupMigration returns whether it needs to setup migration.
func (driver *Driver) NeedsSetupMigration(ctx context.Context) (bool, error) {
	exist, err := driver.hasBytebaseDatabase()
	if err != nil {
		return false, err
	}
	if !exist {
		return true, nil
	}
	if _, err := driver.GetDbConnection(ctx, bytebaseDatabase); err != nil {
		return false, err
	}

	const query = `
		SELECT
		    1
		FROM sqlite_master
		WHERE type='table' AND name = 'bytebase_migration_history'
	`
	return util.NeedsSetupMigrationSchema(ctx, driver.db, query)
}

// SetupMigrationIfNeeded sets up migration if needed.
func (driver *Driver) SetupMigrationIfNeeded(ctx context.Context) error {
	setup, err := driver.NeedsSetupMigration(ctx)
	if err != nil {
		return nil
	}

	if setup {
		driver.l.Info("Bytebase migration schema not found, creating schema...",
			zap.String("environment", driver.connectionCtx.EnvironmentName),
			zap.String("database", driver.connectionCtx.InstanceName),
		)

		if _, err := driver.GetDbConnection(ctx, bytebaseDatabase); err != nil {
			driver.l.Error("Failed to switch to bytebase database.",
				zap.Error(err),
				zap.String("environment", driver.connectionCtx.EnvironmentName),
				zap.String("database", driver.connectionCtx.InstanceName),
			)
			return fmt.Errorf("failed to switch to bytebase database error: %v", err)
		}

		if _, err := driver.db.ExecContext(ctx, migrationSchema); err != nil {
			driver.l.Error("Failed to initialize migration schema.",
				zap.Error(err),
				zap.String("environment", driver.connectionCtx.EnvironmentName),
				zap.String("database", driver.connectionCtx.InstanceName),
			)
			return util.FormatErrorWithQuery(err, migrationSchema)
		}
		driver.l.Info("Successfully created migration schema.",
			zap.String("environment", driver.connectionCtx.EnvironmentName),
			zap.String("database", driver.connectionCtx.InstanceName),
		)
	}

	return nil
}

// CheckDuplicateVersion will check whether the version is already applied.
func (Driver) CheckDuplicateVersion(ctx context.Context, tx *sql.Tx, namespace string, engine db.MigrationEngine, version string) (bool, error) {
	const checkDuplicateVersionQuery = `
		SELECT 1 FROM bytebase_migration_history
		WHERE namespace = ? AND engine = ? AND version = ?
	`
	row, err := tx.QueryContext(ctx, checkDuplicateVersionQuery,
		namespace, engine.String(), version,
	)
	if err != nil {
		return false, util.FormatErrorWithQuery(err, checkDuplicateVersionQuery)
	}
	defer row.Close()

	if row.Next() {
		return true, nil
	}
	return false, nil
}

// CheckOutOfOrderVersion will return versions that are higher than the given version.
func (Driver) CheckOutOfOrderVersion(ctx context.Context, tx *sql.Tx, namespace string, engine db.MigrationEngine, version string) (minVersionIfValid *string, err error) {
	const checkOutofOrderVersionQuery = `
		SELECT MIN(version) FROM bytebase_migration_history
		WHERE namespace = ? AND engine = ? AND version > ?
	`
	row, err := tx.QueryContext(ctx, checkOutofOrderVersionQuery,
		namespace, engine.String(), version,
	)
	if err != nil {
		return nil, util.FormatErrorWithQuery(err, checkOutofOrderVersionQuery)
	}
	defer row.Close()

	var minVersion sql.NullString
	row.Next()
	if err := row.Scan(&minVersion); err != nil {
		return nil, err
	}

	if minVersion.Valid {
		return &minVersion.String, nil
	}

	return nil, nil
}

// FindBaseline retruns true if any baseline is found.
func (Driver) FindBaseline(ctx context.Context, tx *sql.Tx, namespace string) (hasBaseline bool, err error) {
	const findBaselineQuery = `
		SELECT 1 FROM bytebase_migration_history
		WHERE namespace = ? AND type = 'BASELINE'
	`
	row, err := tx.QueryContext(ctx, findBaselineQuery,
		namespace,
	)
	if err != nil {
		return false, util.FormatErrorWithQuery(err, findBaselineQuery)
	}
	defer row.Close()

	if !row.Next() {
		return false, nil
	}

	return true, nil
}

// FindNextSequence will return the highest sequence number plus one.
func (Driver) FindNextSequence(ctx context.Context, tx *sql.Tx, namespace string, requireBaseline bool) (int, error) {
	const findNextSequenceQuery = `
		SELECT MAX(sequence) + 1 FROM bytebase_migration_history
		WHERE namespace = ?
	`
	row, err := tx.QueryContext(ctx, findNextSequenceQuery,
		namespace,
	)
	if err != nil {
		return -1, util.FormatErrorWithQuery(err, findNextSequenceQuery)
	}
	defer row.Close()

	var sequence sql.NullInt32
	row.Next()
	if err := row.Scan(&sequence); err != nil {
		return -1, err
	}

	if !sequence.Valid {
		// Returns 1 if we haven't applied any migration for this namespace and doesn't require baselining
		if !requireBaseline {
			return 1, nil
		}

		// This should not happen normally since we already check the baselining exist beforehand. Just in case.
		return -1, common.Errorf(common.MigrationBaselineMissing, fmt.Errorf("unable to generate next migration_sequence, no migration hisotry found for %q, do you forget to baselining?", namespace))
	}

	return int(sequence.Int32), nil
}

// InsertPendingHistory will insert the migration record with pending status and return the inserted ID.
func (Driver) InsertPendingHistory(ctx context.Context, tx *sql.Tx, sequence int, prevSchema string, m *db.MigrationInfo, statement string) (int64, error) {
	const insertHistoryQuery = `
	INSERT INTO bytebase_migration_history (
		created_by,
		created_ts,
		updated_by,
		updated_ts,
		release_version,
		namespace,
		sequence,
		engine,
		type,
		status,
		version,
		description,
		statement,
		schema,
		schema_prev,
		execution_duration_ns,
		issue_id,
		payload
	)
	VALUES (?, strftime('%s', 'now'), ?, strftime('%s', 'now'), ?, ?, ?, ?,  ?, 'PENDING', ?, ?, ?, ?, ?, 0, ?, ?)
	`
	res, err := tx.ExecContext(ctx, insertHistoryQuery,
		m.Creator,
		m.Creator,
		m.ReleaseVersion,
		m.Namespace,
		sequence,
		m.Engine,
		m.Type,
		m.Version,
		m.Description,
		statement,
		prevSchema,
		prevSchema,
		m.IssueID,
		m.Payload,
	)
	if err != nil {
		return int64(0), util.FormatErrorWithQuery(err, insertHistoryQuery)
	}

	insertedID, err := res.LastInsertId()
	if err != nil {
		return int64(0), util.FormatErrorWithQuery(err, insertHistoryQuery)
	}
	return insertedID, nil
}

// UpdateHistoryAsDone will update the migration record as done.
func (Driver) UpdateHistoryAsDone(ctx context.Context, tx *sql.Tx, migrationDurationNs int64, updatedSchema string, insertedID int64) error {
	const updateHistoryAsDoneQuery = `
	UPDATE
		bytebase_migration_history
	SET
		status = 'DONE',
		execution_duration_ns = ?,
		schema = ?
	WHERE id = ?
	`
	_, err := tx.ExecContext(ctx, updateHistoryAsDoneQuery, migrationDurationNs, updatedSchema, insertedID)
	return err
}

// UpdateHistoryAsFailed will update the migration record as failed.
func (Driver) UpdateHistoryAsFailed(ctx context.Context, tx *sql.Tx, migrationDurationNs int64, insertedID int64) error {
	const updateHistoryAsFailedQuery = `
	UPDATE
		bytebase_migration_history
	SET
		status = 'FAILED',
		execution_duration_ns = ?
	WHERE id = ?
	`
	_, err := tx.ExecContext(ctx, updateHistoryAsFailedQuery, migrationDurationNs, insertedID)
	return err
}

// ExecuteMigration will execute the migration.
func (driver *Driver) ExecuteMigration(ctx context.Context, m *db.MigrationInfo, statement string) (int64, string, error) {
	return util.ExecuteMigration(ctx, driver.l, driver, m, statement)
}

// FindMigrationHistoryList finds the migration history.
func (driver *Driver) FindMigrationHistoryList(ctx context.Context, find *db.MigrationHistoryFind) ([]*db.MigrationHistory, error) {
	baseQuery := `
	SELECT
		id,
		created_by,
		created_ts,
		updated_by,
		updated_ts,
		release_version,
		namespace,
		sequence,
		engine,
		type,
		status,
		version,
		description,
		statement,
		schema,
		schema_prev,
		execution_duration_ns,
		issue_id,
		payload
		FROM bytebase_migration_history `
	paramNames, params := []string{}, []interface{}{}
	if v := find.ID; v != nil {
		paramNames, params = append(paramNames, "id"), append(params, *v)
	}
	if v := find.Database; v != nil {
		paramNames, params = append(paramNames, "namespace"), append(params, *v)
	}
	if v := find.Version; v != nil {
		paramNames, params = append(paramNames, "version"), append(params, *v)
	}
	var query = baseQuery +
		db.FormatParamNameInQuestionMark(paramNames) +
		`ORDER BY created_ts DESC`
	if v := find.Limit; v != nil {
		query += fmt.Sprintf(" LIMIT %d", *v)
	}
	return util.FindMigrationHistoryList(ctx, query, params, driver, find, baseQuery)
}

// Dump dumps the database.
func (driver *Driver) Dump(ctx context.Context, database string, out io.Writer, schemaOnly bool) error {
	if database == "" {
		return fmt.Errorf("SQLite can dump one database only at a time")
	}
	if !schemaOnly {
		return fmt.Errorf("SQLite can dump schema only")
	}

	// Find all dumpable databases and make sure the existence of the database to be dumped.
	databases, err := driver.getDatabases()
	if err != nil {
		return fmt.Errorf("failed to get databases: %s", err)
	}
	exist := false
	for _, n := range databases {
		if n == database {
			exist = true
			break
		}
	}
	if !exist {
		return fmt.Errorf("database %s not found", database)
	}

	if err := driver.dumpOneDatabase(ctx, database, out, schemaOnly); err != nil {
		return err
	}

	return nil
}

func (driver *Driver) dumpOneDatabase(ctx context.Context, database string, out io.Writer, schemaOnly bool) error {
	if _, err := driver.GetDbConnection(ctx, database); err != nil {
		return err
	}

	txn, err := driver.db.BeginTx(ctx, &sql.TxOptions{ReadOnly: true})
	if err != nil {
		return err
	}
	defer txn.Rollback()

	query := "SELECT sql FROM sqlite_schema;"
	rows, err := txn.QueryContext(ctx, query)
	if err != nil {
		return util.FormatErrorWithQuery(err, query)
	}
	defer rows.Close()

	for rows.Next() {
		var s string
		if err := rows.Scan(
			&s,
		); err != nil {
			return err
		}

		if _, err := io.WriteString(out, fmt.Sprintf("%s;\n", s)); err != nil {
			return err
		}
	}
	if err := rows.Err(); err != nil {
		return err
	}
	if err := txn.Commit(); err != nil {
		return err
	}

	return nil
}

// Restore restores a database.
func (driver *Driver) Restore(ctx context.Context, sc *bufio.Scanner) (err error) {
	txn, err := driver.db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer txn.Rollback()

	f := func(stmt string) error {
		if _, err := txn.Exec(stmt); err != nil {
			return err
		}
		return nil
	}

	if err := util.ApplyMultiStatements(sc, f); err != nil {
		return err
	}

	if err := txn.Commit(); err != nil {
		return err
	}

	return nil
}
