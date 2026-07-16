from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from pathlib import Path
from uuid import uuid4
import json
import os
import re
import threading
import time
import urllib.parse


ROOT = Path(__file__).resolve().parent
ROOM_CODE_RE = re.compile(r"[^A-Z0-9-]")
FIBONACCI = [0, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89]
rooms = {}
deleted_rooms = set()
lock = threading.Lock()


def now():
    return time.time()


def clean_room_code(value):
    code = ROOM_CODE_RE.sub("", value.upper().strip().replace(" ", "-"))
    return code[:24] or "SALA"


def clean_name(value):
    name = " ".join(value.strip().split())
    return name[:28] or "Sin nombre"


def room_payload(room):
    voters = []
    votes = []
    for voter in room["voters"].values():
        vote = voter.get("vote")
        if vote is not None:
            votes.append(vote)
        voters.append(
            {
                "id": voter["id"],
                "name": voter["name"],
                "vote": vote if room["revealed"] else None,
                "hasVoted": vote is not None,
            }
        )

    average = None
    rounded = None
    if room["revealed"] and votes:
        raw_average = sum(votes) / len(votes)
        floored = int(raw_average)
        rounded = max([n for n in FIBONACCI if n <= floored], default=0)
        average = round(raw_average, 2)

    return {
        "code": room["code"],
        "story": room["story"],
        "revealed": room["revealed"],
        "round": room["round"],
        "sequence": FIBONACCI,
        "voters": voters,
        "average": average,
        "rounded": rounded,
        "updatedAt": room["updated_at"],
    }


def room_summary(room):
    return {
        "code": room["code"],
        "story": room["story"],
        "round": room["round"],
        "voters": len(room["voters"]),
        "revealed": room["revealed"],
        "updatedAt": room["updated_at"],
    }


def ensure_room(code):
    room = rooms.get(code)
    if room is None:
        room = {
            "code": code,
            "story": "",
            "revealed": False,
            "round": 1,
            "voters": {},
            "updated_at": now(),
        }
        rooms[code] = room
    return room


def read_json(handler):
    length = int(handler.headers.get("Content-Length", "0"))
    if length == 0:
        return {}
    body = handler.rfile.read(length).decode("utf-8")
    return json.loads(body)


class ScrumPokerHandler(SimpleHTTPRequestHandler):
    def translate_path(self, path):
        clean_path = urllib.parse.urlparse(path).path
        if clean_path == "/":
            return str(ROOT / "index.html")
        return str(ROOT / clean_path.lstrip("/"))

    def send_json(self, payload, status=200):
        body = json.dumps(payload).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Cache-Control", "no-store")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self):
        parsed = urllib.parse.urlparse(self.path)
        if parsed.path == "/api/rooms":
            with lock:
                active_rooms = sorted(
                    [room_summary(room) for room in rooms.values()],
                    key=lambda item: item["updatedAt"],
                    reverse=True,
                )
                self.send_json({"rooms": active_rooms[:24]})
            return

        if parsed.path == "/api/room":
            query = urllib.parse.parse_qs(parsed.query)
            code = clean_room_code(query.get("code", [""])[0])
            with lock:
                if code in deleted_rooms:
                    self.send_json({"error": "Sala eliminada"}, status=404)
                    return
                room = ensure_room(code)
                self.send_json(room_payload(room))
            return
        super().do_GET()

    def do_POST(self):
        parsed = urllib.parse.urlparse(self.path)
        try:
            data = read_json(self)
        except json.JSONDecodeError:
            self.send_json({"error": "JSON invalido"}, status=400)
            return

        if parsed.path == "/api/join":
            code = clean_room_code(data.get("code", ""))
            name = clean_name(data.get("name", ""))
            voter_id = data.get("id") or uuid4().hex
            with lock:
                deleted_rooms.discard(code)
                room = ensure_room(code)
                existing = room["voters"].get(voter_id, {})
                room["voters"][voter_id] = {
                    "id": voter_id,
                    "name": name,
                    "vote": existing.get("vote"),
                    "last_seen": now(),
                }
                room["updated_at"] = now()
                self.send_json({"id": voter_id, "room": room_payload(room)})
            return

        if parsed.path == "/api/vote":
            code = clean_room_code(data.get("code", ""))
            voter_id = data.get("id", "")
            vote = data.get("vote")
            if vote not in FIBONACCI:
                self.send_json({"error": "Voto fuera de la secuencia"}, status=400)
                return
            with lock:
                room = ensure_room(code)
                if voter_id not in room["voters"]:
                    self.send_json({"error": "Participante no encontrado"}, status=404)
                    return
                room["voters"][voter_id]["vote"] = vote
                room["voters"][voter_id]["last_seen"] = now()
                room["updated_at"] = now()
                self.send_json(room_payload(room))
            return

        if parsed.path == "/api/update-name":
            code = clean_room_code(data.get("code", ""))
            voter_id = data.get("id", "")
            name = clean_name(data.get("name", ""))
            with lock:
                room = rooms.get(code)
                if room is None or voter_id not in room["voters"]:
                    self.send_json({"error": "Participante no encontrado"}, status=404)
                    return
                room["voters"][voter_id]["name"] = name
                room["voters"][voter_id]["last_seen"] = now()
                room["updated_at"] = now()
                self.send_json(room_payload(room))
            return

        if parsed.path == "/api/reveal":
            code = clean_room_code(data.get("code", ""))
            with lock:
                room = ensure_room(code)
                room["revealed"] = True
                room["updated_at"] = now()
                self.send_json(room_payload(room))
            return

        if parsed.path == "/api/delete-room":
            code = clean_room_code(data.get("code", ""))
            with lock:
                rooms.pop(code, None)
                deleted_rooms.add(code)
                active_rooms = sorted(
                    [room_summary(room) for room in rooms.values()],
                    key=lambda item: item["updatedAt"],
                    reverse=True,
                )
                self.send_json({"deleted": code, "rooms": active_rooms[:24]})
            return

        if parsed.path == "/api/reset":
            code = clean_room_code(data.get("code", ""))
            story = " ".join(data.get("story", "").strip().split())[:80]
            with lock:
                room = ensure_room(code)
                room["story"] = story
                room["revealed"] = False
                room["round"] += 1
                for voter in room["voters"].values():
                    voter["vote"] = None
                room["updated_at"] = now()
                self.send_json(room_payload(room))
            return

        self.send_json({"error": "Ruta no encontrada"}, status=404)


if __name__ == "__main__":
    port = int(os.environ.get("PORT", "8000"))
    default_host = "0.0.0.0" if os.environ.get("PORT") else "127.0.0.1"
    host = os.environ.get("HOST", default_host)
    address = (host, port)
    server = ThreadingHTTPServer(address, ScrumPokerHandler)
    print(f"Scrum Poker listo en http://{host}:{port}")
    server.serve_forever()
