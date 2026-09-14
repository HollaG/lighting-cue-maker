// feature[class=Realtime] Connection shutdown regression tests

import { afterEach, describe, expect, it, vi } from "vitest";
import { ClientMessageType, ServerMessageType } from "../types/realtime/realtime";
import { connectWebTransport } from "./connectWebTransport";

const leaveMessage = {
  type: ClientMessageType.ClientMessageRoomLeave,
  data: { itemId: "item-1" },
  timestamp: 1,
};

/** Use real Web Streams so closing the fake session also settles pending I/O. */
function setupTransport() {
  const abortController = new AbortController();
  const shutdownError = new Error("Session closed");
  let receiveController: ReadableStreamDefaultController<Uint8Array>;
  let sendController: WritableStreamDefaultController;
  let resolveClosed: () => void;
  const cancel = vi.fn();
  const abort = vi.fn();
  const write = vi.fn<(chunk: Uint8Array) => Promise<void>>().mockResolvedValue(undefined);
  const readable = new ReadableStream<Uint8Array>({
    start(controller) {
      receiveController = controller;
    },
    cancel,
  });
  const writable = new WritableStream<Uint8Array>({
    start(controller) {
      sendController = controller;
    },
    write,
    abort,
  });
  const transport = {
    ready: Promise.resolve(),
    closed: new Promise<void>((resolve) => {
      resolveClosed = resolve;
    }),
    createBidirectionalStream: vi.fn().mockResolvedValue({ readable, writable }),
    close: vi.fn(() => {
      receiveController.error(shutdownError);
      sendController.error(shutdownError);
      resolveClosed();
    }),
  };
  const constructor = vi.fn(function () {
    return transport;
  });
  vi.stubGlobal("WebTransport", constructor);
  const options = {
    signal: abortController.signal,
    onMessage: vi.fn(),
    onClose: vi.fn(),
    onError: vi.fn(),
  };

  return {
    abortController,
    shutdownError,
    transport,
    constructor,
    options,
    write,
    cancel,
    abort,
    receive(message: object) {
      receiveController.enqueue(new TextEncoder().encode(JSON.stringify(message) + "\n"));
    },
    connect: () => connectWebTransport("https://example.test/realtime", options),
  };
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("WebTransport shutdown", () => {
  it("settles pending reads and writes without independently resetting streams", async () => {
    const fixture = setupTransport();
    let rejectWrite!: (reason: unknown) => void;
    fixture.write.mockReturnValueOnce(new Promise<void>((_resolve, reject) => {
      rejectWrite = reject;
    }));
    const connection = await fixture.connect();
    const pendingSend = connection.send(leaveMessage);
    const rejection = expect(pendingSend).rejects.toBe(fixture.shutdownError);
    await vi.waitFor(() => expect(fixture.write).toHaveBeenCalledOnce());

    fixture.abortController.abort();
    rejectWrite(fixture.shutdownError);
    await rejection;

    expect(fixture.transport.close).toHaveBeenCalledOnce();
    expect(fixture.cancel).not.toHaveBeenCalled();
    expect(fixture.abort).not.toHaveBeenCalled();
    expect(fixture.options.onError).not.toHaveBeenCalled();
    expect(fixture.options.onClose).not.toHaveBeenCalled();
  });

  it("ignores late unmount sends and repeated close requests", async () => {
    const fixture = setupTransport();
    const connection = await fixture.connect();
    await connection.send(leaveMessage);

    fixture.abortController.abort();
    connection.close();
    connection.close();
    await connection.send(leaveMessage);

    expect(fixture.transport.close).toHaveBeenCalledOnce();
    expect(fixture.write).toHaveBeenCalledOnce();
  });

  it("does not deliver an already-read message after unmount", async () => {
    const fixture = setupTransport();
    const connection = await fixture.connect();
    const message = {
      type: ServerMessageType.ServerMessageRoomLeft,
      data: { itemId: "item-1" },
      timestamp: 1,
    };
    fixture.receive(message);
    await vi.waitFor(() => expect(fixture.options.onMessage).toHaveBeenCalledWith(message));
    fixture.options.onMessage.mockClear();

    // The read has resolved, but its continuation has not run when we close.
    fixture.receive(message);
    connection.close();
    await fixture.transport.closed;

    expect(fixture.options.onMessage).not.toHaveBeenCalled();
    expect(fixture.options.onError).not.toHaveBeenCalled();
  });

  it("does not create a connection for an already-aborted owner", async () => {
    const fixture = setupTransport();
    fixture.abortController.abort();

    await expect(fixture.connect()).rejects.toBe(fixture.options.signal.reason);
    expect(fixture.constructor).not.toHaveBeenCalled();
  });
});
