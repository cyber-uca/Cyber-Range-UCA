import os
os.environ["PROVISIONING_BACKEND"] = "simulate"

from app import models


def _make_room_with_vm(db):
    path = models.Path(slug="p", title="P")
    db.add(path); db.flush()
    module = models.Module(path_id=path.id, title="M", slug="m")
    db.add(module); db.flush()
    room = models.Room(module_id=module.id, slug="r1", title="Room1", estimated_minutes=60)
    db.add(room); db.flush()
    tpl = models.VMTemplate(name="Kali", zone="attack", proxmox_template_id=100)
    db.add(tpl); db.flush()
    db.add(models.RoomVMTemplate(room_id=room.id, vm_template_id=tpl.id))
    db.commit()
    return room, tpl


def test_pause_stop_resume_cycle(client, test_db, learner_headers):
    room, tpl = _make_room_with_vm(test_db)

    r = client.post(f"/environments/rooms/{room.id}/start-vm",
                     json={"vm_template_id": tpl.id}, headers=learner_headers)
    print("START", r.status_code, r.json())
    assert r.status_code == 200

    r = client.post(f"/environments/rooms/{room.id}/pause-vm",
                     json={"vm_template_id": tpl.id}, headers=learner_headers)
    print("PAUSE", r.status_code, r.json())
    assert r.status_code == 200

    r = client.get(f"/environments/rooms/{room.id}/mine", headers=learner_headers)
    print("MINE-AFTER-PAUSE", r.status_code, r.json())
    assert r.status_code == 200
    mine = r.json()
    assert mine is not None
    assert mine["vms"][0]["status"] == "paused"

    r = client.post(f"/environments/rooms/{room.id}/heartbeat", headers=learner_headers)
    print("HEARTBEAT-AFTER-PAUSE", r.status_code, r.json())
    assert r.json()["env"]["vms"][0]["status"] == "paused"

    r = client.post(f"/environments/rooms/{room.id}/resume-vm",
                     json={"vm_template_id": tpl.id}, headers=learner_headers)
    print("RESUME", r.status_code, r.json())
    assert r.status_code == 200
    assert r.json()["vms"][0]["status"] == "running"

    r = client.post(f"/environments/rooms/{room.id}/pause-vm",
                     json={"vm_template_id": tpl.id}, headers=learner_headers)
    print("PAUSE-AGAIN", r.status_code, r.json())
    assert r.status_code == 200

    r = client.post(f"/environments/rooms/{room.id}/stop-vm",
                     json={"vm_template_id": tpl.id}, headers=learner_headers)
    print("STOP-WHILE-PAUSED", r.status_code, r.json())
    assert r.status_code == 200
