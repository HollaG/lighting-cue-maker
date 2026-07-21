# Stage 1: Build the binary
FROM golang:1.26.5-trixie AS builder

WORKDIR /app

# Download dependencies
COPY go.mod go.sum ./
RUN go mod download

# Copy source code
COPY . .

# Build a static binary
RUN CGO_ENABLED=0 GOOS=linux go build -ldflags="-w -s" -o server .

# Stage 2: Minimal runtime image
FROM alpine:3.21

WORKDIR /app

# Add certificates for SSL/TLS if needed
RUN apk --no-cache add ca-certificates tzdata

# Copy binary from builder
COPY --from=builder /app/server .

# Default environment variables (can be overridden at runtime)
ENV PORT=8080

EXPOSE ${PORT}

CMD ["./server"]
