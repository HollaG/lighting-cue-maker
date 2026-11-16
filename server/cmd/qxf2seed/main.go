// Command qxf2seed turns a QLC+ fixture definition (.qxf) into a seed file for the built-in fixture library
// (server/templates). Run from the server folder:
//
//	go run ./cmd/qxf2seed path/to/fixture.qxf                 # prints the SQL
//	go run ./cmd/qxf2seed -out templates path/to/fixture.qxf  # writes templates/<manufacturer-model>.sql
//	go run ./cmd/qxf2seed -brightness 25 ...                  # brightnessModifier (default 100)
//
// Warnings (a preset or fixture type it doesn't know) go to stderr; those channels import as "custom".
package main

import (
	"flag"
	"fmt"
	"os"
	"path/filepath"
)

func main() {
	outDir := flag.String("out", "", "folder to write <manufacturer-model>.sql into (default: print to stdout)")
	brightness := flag.Int("brightness", 100, "brightnessModifier: how bright the fixture looks in the visualiser (%)")
	flag.Parse()
	if flag.NArg() != 1 {
		fmt.Fprintln(os.Stderr, "usage: qxf2seed [-out folder] fixture.qxf")
		os.Exit(2)
	}
	path := flag.Arg(0)

	raw, err := os.ReadFile(path)
	if err != nil {
		fail(err)
	}
	t, warnings, err := convert(raw)
	if err != nil {
		fail(err)
	}
	for _, w := range warnings {
		fmt.Fprintln(os.Stderr, "warning:", w)
	}
	t.Properties.BrightnessModifier = *brightness // CueSketch-only: QLC+ files have nothing for it
	sql, err := render(t, filepath.Base(path))
	if err != nil {
		fail(err)
	}

	if *outDir == "" {
		fmt.Print(sql)
		return
	}
	outPath := filepath.Join(*outDir, fileName(t))
	if err := os.WriteFile(outPath, []byte(sql), 0o644); err != nil {
		fail(err)
	}
	fmt.Fprintf(os.Stderr, "wrote %s (%d channels, %d modes)\n", outPath, len(t.Channels), len(t.Modes))
}

func fail(err error) {
	fmt.Fprintln(os.Stderr, "error:", err)
	os.Exit(1)
}
