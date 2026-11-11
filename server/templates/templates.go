// Package templates is the built-in fixture library: one SQL file per fixture template,
// embedded into the server binary so a deployed server doesn't need the files on disk.
//
// Every file must only insert its template when the library doesn't have it yet
// (INSERT ... SELECT ... WHERE NOT EXISTS on manufacturer + model), because the
// server runs all of them on every start. See v2.SeedFixtureTemplates.
package templates

import "embed"

// FS holds every *.sql file in this folder.
//
//go:embed *.sql
var FS embed.FS
