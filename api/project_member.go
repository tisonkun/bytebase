package api

import (
	"context"
	"encoding/json"

	"github.com/bytebase/bytebase/common"
)

// ProjectRoleProvider is the role provider for a user in projects.
type ProjectRoleProvider string

const (
	// ProjectRoleProviderBytebase is the role provider of a project.
	ProjectRoleProviderBytebase ProjectRoleProvider = "BYTEBASE"
	// ProjectRoleProviderGitlabSelfHost is the role provider of a project.
	ProjectRoleProviderGitlabSelfHost ProjectRoleProvider = "GITLAB_SELF_HOST"
)

func (e ProjectRoleProvider) String() string {
	switch e {
	case ProjectRoleProviderBytebase:
		return "BYTEBASE"
	case ProjectRoleProviderGitlabSelfHost:
		return "GITLAB_SELF_HOST"
	}
	return ""
}

// ProjectMember is the API message for project members.
type ProjectMember struct {
	ID int `jsonapi:"primary,projectMember"`

	// Standard fields
	CreatorID int
	Creator   *Principal `jsonapi:"attr,creator"`
	CreatedTs int64      `jsonapi:"attr,createdTs"`
	UpdaterID int
	Updater   *Principal `jsonapi:"attr,updater"`
	UpdatedTs int64      `jsonapi:"attr,updatedTs"`

	// Related fields
	// Just returns ProjectID otherwise would cause circular dependency.
	ProjectID int `jsonapi:"attr,projectId"`

	// Domain specific fields
	RoleProvider string `jsonapi:"attr,roleProvider"`
	Role         string `jsonapi:"attr,role"`
	PrincipalID  int
	Principal    *Principal `jsonapi:"attr,principal"`
}

// ProjectMemberCreate is the API message for creating a project member.
type ProjectMemberCreate struct {
	// Standard fields
	// Value is assigned from the jwt subject field passed by the client.
	CreatorID int

	// Related fields
	ProjectID int

	// Domain specific fields
	RoleProvider ProjectRoleProvider `jsonapi:"attr,roleProvider"`
	Role         common.ProjectRole         `jsonapi:"attr,role"`
	PrincipalID  int                 `jsonapi:"attr,principalId"`
}

// ProjectMemberFind is the API message for finding project members.
type ProjectMemberFind struct {
	ID *int

	// Related fields
	ProjectID *int
}

func (find *ProjectMemberFind) String() string {
	str, err := json.Marshal(*find)
	if err != nil {
		return err.Error()
	}
	return string(str)
}

// ProjectMemberPatch is the API message for patching a project member.
type ProjectMemberPatch struct {
	ID int

	// Standard fields
	// Value is assigned from the jwt subject field passed by the client.
	UpdaterID int

	// Domain specific fields
	RoleProvider string  `jsonapi:"attr,roleProvider"`
	Role         *string `jsonapi:"attr,role"`
}

// ProjectMemberDelete is the API message for deleting a project member.
type ProjectMemberDelete struct {
	ID int

	// Standard fields
	// Value is assigned from the jwt subject field passed by the client.
	DeleterID int
}

// ProjectMemberService is the service for project members.
type ProjectMemberService interface {
	CreateProjectMember(ctx context.Context, create *ProjectMemberCreate) (*ProjectMember, error)
	FindProjectMemberList(ctx context.Context, find *ProjectMemberFind) ([]*ProjectMember, error)
	FindProjectMember(ctx context.Context, find *ProjectMemberFind) (*ProjectMember, error)
	PatchProjectMember(ctx context.Context, patch *ProjectMemberPatch) (*ProjectMember, error)
	DeleteProjectMember(ctx context.Context, delete *ProjectMemberDelete) error
}
