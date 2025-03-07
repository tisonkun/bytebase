package tests

import (
	"database/sql"
	"fmt"
	"path"
	"testing"

	"github.com/bytebase/bytebase/resources"
	embeddedpostgres "github.com/fergusstrange/embedded-postgres"
	_ "github.com/lib/pq"
)

const (
	port = 1301
)

func TestEmbeddedPostgresSelectOne(t *testing.T) {
	dataDir := t.TempDir()
	resourceDir := path.Join(dataDir, "resources")
	pgdataDir := path.Join(dataDir, "pgdata")
	pgruntimeDir := path.Join(dataDir, "pgruntime")
	pgbinPath, err := resources.InstallPostgres(resourceDir, pgdataDir)
	if err != nil {
		t.Fatal(err)
	}
	database := embeddedpostgres.NewDatabase(
		embeddedpostgres.
			DefaultConfig().
			Port(port).
			Version(embeddedpostgres.V14).
			BinariesPath(pgbinPath).
			RuntimePath(pgruntimeDir).
			DataPath(pgdataDir),
	)
	if err := database.Start(); err != nil {
		t.Fatal(err)
	}

	defer func() {
		if err := database.Stop(); err != nil {
			t.Fatal(err)
		}
	}()

	dsn := fmt.Sprintf("host=localhost port=%d user=postgres password=postgres dbname=postgres sslmode=disable", port)
	db, err := sql.Open("postgres", dsn)
	if err != nil {
		t.Fatal(err)
	}

	var result int
	row := db.QueryRow("SELECT 1")
	if err := row.Scan(&result); err != nil {
		t.Fatal(err)
	}
	if result != 1 {
		t.Errorf("want result 1, got %v", result)
	}
}
