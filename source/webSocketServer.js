import crypto from "crypto";

export const OpCodes = {
	Continue: 0x0,
	Text: 0x1,
	Binary: 0x2,
	CloseConnection: 0x8,
	Ping: 0x9,
	Pong: 0xa,
};

export class WebSocketServer {
	constructor(server, clientMessageCallback, allowedOrigins = []) {
		this.allowedOrigins = allowedOrigins;
		this.clients = new Map();
		this.clientMessageCallback = clientMessageCallback;
		this.partialMessages = new Map();

		server.on("upgrade", (request, socket) => {
			if (request.headers["upgrade"].toLowerCase() !== "websocket") {
				socket.destroy();

				return;
			}

			if (!this.#isOriginAllowed(request)) {
				socket.write("HTTP/1.1 403 Forbidden\r\nConnection: close\r\n\r\n");
				socket.destroy();

				return;
			}

			this.#upgradeToWebsocket(request, socket);
		});
	}

	#applyMask(payload, mask) {
		return Buffer.from(payload.map((byte, i) => byte ^ mask[i % 4]));
	}

	#createFrame(length) {
		if (length < 126) {
			const frame = Buffer.alloc(2 + length);
			frame[0] = 0x81;
			frame[1] = length;

			return { frame, payloadOffset: 2 };
		}

		if (length < 65536) {
			const frame = Buffer.alloc(4 + length);
			frame[0] = 0x81;
			frame[1] = 126;
			frame.writeUInt16BE(length, 2);

			return { frame, payloadOffset: 4 };
		}

		const frame = Buffer.alloc(10 + length);
		frame[0] = 0x81;
		frame[1] = 127;
		frame.writeBigUInt64BE(BigInt(length), 2);

		return { frame, payloadOffset: 10 };
	}

	#decodeMessage(data) {
		if (data.length < 2) {
			return null;
		}

		const { length, maskStart } = this.#getPayloadLength(data);
		const payload = data.slice(maskStart + 4, maskStart + 4 + length);
		const mask = data.slice(maskStart, maskStart + 4);

		return this.#applyMask(payload, mask).toString("utf8");
	}

	#encodeMessage(message) {
		const messageBuffer = Buffer.from(message);
		const { frame, payloadOffset } = this.#createFrame(messageBuffer.length);
		messageBuffer.copy(frame, payloadOffset);

		return frame;
	}

	#getPayloadLength(data) {
		const length = data[1] & 127;

		if (length === 126) {
			return {
				length: data.readUInt16BE(2),
				maskStart: 4,
			};
		}

		if (length === 127) {
			return {
				length: data.readBigUInt64BE(2),
				maskStart: 10,
			};
		}

		return {
			length,
			maskStart: 2,
		};
	}

	#generateAcceptKey(key) {
		return crypto
			.createHash("sha1")
			.update(`${key}258EAFA5-E914-47DA-95CA-C5AB0DC85B11`)
			.digest("base64");
	}

	#handleCloseConnection(clientId, code = 1000, reason = "") {
		const client = this.clients.get(clientId);
		const reasonBuffer = Buffer.from(reason);
		const frameLength = reasonBuffer.length + 2;
		const { frame, payloadOffset } = this.#createFrame(frameLength);

		frame[0] = 0x88;
		frame.writeUInt16BE(code, payloadOffset);
		reasonBuffer.copy(frame, payloadOffset + 2);

		client.write(frame, () => {
			client.end();

			this.clients.delete(clientId);
			this.partialMessages.delete(clientId);
		});
	}

	#handleContinue(clientId, messageData, opCode, isFinalFrame) {
		if (this.partialMessages.has(clientId) === false) {
			console.warn("Received continuation frame without a starting frame.");

			return;
		}

		const previousData = this.partialMessages.get(clientId);
		const newData = previousData + this.#decodeMessage(messageData);

		if (isFinalFrame === true) {
			this.clientMessageCallback?.(newData, opCode, clientId);

			this.partialMessages.delete(clientId);
		}
		else {
			this.partialMessages.set(clientId, newData);
		}
	}

	#handleDataFrame(clientId, messageData, opCode, isFinalFrame) {
		if (isFinalFrame === true) {
			const message = this.#decodeMessage(messageData);

			this.clientMessageCallback?.(message, opCode, clientId);
		}
		else {
			this.partialMessages.set(clientId, this.#decodeMessage(messageData));
		}
	}

	#handlePing(clientId, pingPayload) {
		const frame = Buffer.concat([
			Buffer.from([0x8a, pingPayload.length]),
			pingPayload,
		]);

		this.clients.get(clientId)?.write(frame);
	}

	#handleReceivedMessage(clientId, messageData) {
		const opCode = messageData[0] & 0x0f;
		const isFinalFrame = (messageData[0] & 0x80) !== 0;

		switch (opCode) {
			case OpCodes.Continue:
				this.#handleContinue(clientId, messageData, opCode, isFinalFrame);
				break;

			case OpCodes.Text:
			case OpCodes.Binary:
				this.#handleDataFrame(clientId, messageData, opCode, isFinalFrame);
				break;

			case OpCodes.CloseConnection:
				this.#handleCloseConnection(clientId);
				break;

			case OpCodes.Ping:
				this.#handlePing(clientId, messageData.slice(1));
				break;
		}
	}

	#isOriginAllowed(request) {
		if (this.allowedOrigins.length === 0) {
			return true;
		}

		const origin = request.headers["origin"];

		return this.allowedOrigins.includes(origin);
	}

	#upgradeToWebsocket(request, socket) {
		const key = request.headers["sec-websocket-key"];
		const acceptKey = this.#generateAcceptKey(key);

		socket.write(
			`HTTP/1.1 101 Switching Protocols\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Accept: ${acceptKey}\r\n\r\n`,
		);

		const clientId = crypto.randomUUID();
		this.clients.set(clientId, socket);

		socket.on("data", (data) => this.#handleReceivedMessage(clientId, data));
		socket.on("close", () => this.clients.delete(clientId));
		socket.on("error", () => this.clients.delete(clientId));
	}

	sendBroadcast(message) {
		const frame = this.#encodeMessage(message);

		this.clients.forEach((client) => client.write(frame));
	}

	sendClient(message, clientId) {
		const frame = this.#encodeMessage(message);

		this.clients.get(clientId)?.write(frame);
	}
}
