# WebTransport local development

The WebTransport server listens on UDP port `6121` and accepts sessions at:

```text
https://localhost:6121/api/v1/realtime
```

The HTTP/3 server's `Addr` field must contain only the listen address:

```go
Addr: ":6121"
```

Passing the complete URL as `Addr` causes `too many colons in address`.

## HTTP/3 TLS configuration

The initial browser connection failed with:

```text
QUIC_HANDSHAKE_FAILED
NO_APPLICATION_PROTOCOL
MISSING_EXTENSION(extension 16)
```

The server had a certificate, but its TLS configuration did not advertise the
HTTP/3 ALPN protocol (`h3`). Configure TLS through `http3.ConfigureTLSConfig`:

```go
http3Server := &http3.Server{
	Addr:      address,
	TLSConfig: http3.ConfigureTLSConfig(&tls.Config{}),
	QUICConfig: &quic.Config{
		EnableDatagrams: true,
	},
	Handler: mux,
}

webtransport.ConfigureHTTP3Server(http3Server)
```

These two configuration calls serve different purposes:

- `http3.ConfigureTLSConfig` advertises HTTP/3 during the TLS handshake.
- `webtransport.ConfigureHTTP3Server` advertises WebTransport support in the
  HTTP/3 settings.

## Chrome certificate failure on Windows

After fixing ALPN, Chrome reached certificate verification but failed with:

```text
QUIC_TLS_CERTIFICATE_UNKNOWN
CERTIFICATE_VERIFY_FAILED
```

The development certificate contained valid subject alternative names for
`localhost`, `127.0.0.1`, and `::1`. Its mkcert root CA was also installed in
the Windows user trust store. In this environment, Chrome's WebTransport/QUIC
connection still rejected the certificate.

The working local-development workaround was to launch a dedicated Chrome
profile from PowerShell:

```powershell
& "$env:ProgramFiles\Google\Chrome\Application\chrome.exe" `
  --origin-to-force-quic-on=localhost:6121 `
  --ignore-certificate-errors `
  --user-data-dir="$env:TEMP\chrome-webtransport-test"
```

The flags do the following:

- `--origin-to-force-quic-on` forces QUIC for the WebTransport listener.
- `--ignore-certificate-errors` bypasses certificate verification in that
  Chrome instance.
- `--user-data-dir` uses an isolated profile and avoids cached network state.

Only use this Chrome profile for local development. Certificate verification
is disabled in that instance. A deployed server should use a normally trusted
certificate. Certificate hash pinning with `serverCertificateHashes` and a
short-lived certificate is another option for local development.

## Browser connection test

Run this from the developer console of the allowed frontend origin:

```js
const transport = new WebTransport("https://localhost:6121/api/v1/realtime", {
  protocols: ["lighting-realtime-v1"],
});

await transport.ready;
console.log("Connected:", transport.protocol);
```

Expected output:

```text
Connected: lighting-realtime-v1
```

Relevant links:

- https://github.com/security-union/videocall-rs/wiki/WebTransport---TLS-Cert
- https://github.com/GoogleChrome/samples/blob/8223e1b7f619bde037cf010dd9a2d899556a2d89/quictransport/quic_transport_server.py#L56-L75
- https://letsencrypt.org/docs/certificates-for-localhost/
