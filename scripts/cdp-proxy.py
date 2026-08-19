"""
CDP Host-rewriting proxy for driving Chrome inside an E2B sandbox.

Chrome binds DevTools to 127.0.0.1 and rejects requests whose Host header isn't
localhost/IP. When reached via E2B getHost() (a *.e2b.app domain), that check
fails. This proxy listens on 0.0.0.0:9223 and rewrites the request Host header
to localhost:9222 for BOTH plain HTTP (/json*) and WebSocket-upgrade requests,
then relays raw bytes. It does NOT touch response bodies — the client builds the
public wss URL itself, so no body rewriting (and no truncation) is needed.
"""
import asyncio

CHROME_HOST, CHROME_PORT = "127.0.0.1", 9222
LISTEN_PORT = 9223


async def pipe(reader, writer):
    try:
        while True:
            data = await reader.read(65536)
            if not data:
                break
            writer.write(data)
            await writer.drain()
    except Exception:
        pass
    finally:
        try:
            writer.close()
        except Exception:
            pass


async def handle(client_reader, client_writer):
    try:
        chrome_reader, chrome_writer = await asyncio.open_connection(
            CHROME_HOST, CHROME_PORT
        )
    except Exception:
        client_writer.close()
        return

    # Rewrite the Host header on the first request (covers /json + ws upgrade),
    # then relay both directions untouched.
    first = await client_reader.read(65536)
    head, sep, body = first.partition(b"\r\n\r\n")
    lines = head.split(b"\r\n")
    lines = [
        b"Host: localhost:9222" if l.lower().startswith(b"host:") else l
        for l in lines
    ]
    chrome_writer.write(b"\r\n".join(lines) + sep + body)
    await chrome_writer.drain()

    await asyncio.gather(
        pipe(chrome_reader, client_writer),
        pipe(client_reader, chrome_writer),
    )


async def main():
    server = await asyncio.start_server(handle, "0.0.0.0", LISTEN_PORT)
    async with server:
        await server.serve_forever()


asyncio.run(main())
