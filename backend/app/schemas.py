from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel

from .models import Role, EnvironmentStatus


# ---------- Auth ----------
class UserRegister(BaseModel):
    name: str
    email: str
    institution: Optional[str] = None
    password: str


class UserLogin(BaseModel):
    email: str
    password: str


class UserOut(BaseModel):
    id: str
    name: str
    email: str
    institution: Optional[str]
    role: Role
    points: int
    is_active: bool

    class Config:
        from_attributes = True


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut


# ---------- Challenges ----------
class HintOut(BaseModel):
    id: str
    content: str
    cost: int
    order: int

    class Config:
        from_attributes = True


class VMTemplateOut(BaseModel):
    id: str
    name: str
    description: Optional[str]
    zone: str
    proxmox_template_id: int
    default_tools: Optional[str]

    class Config:
        from_attributes = True


class ChallengeVMOut(BaseModel):
    vm_template: VMTemplateOut
    canvas_x: float
    canvas_y: float

    class Config:
        from_attributes = True


# ---------- Categories & Difficulties (data-driven, admin-managed) ----------
class CategoryOut(BaseModel):
    id: str
    slug: str
    name: str
    color: str
    description: Optional[str]
    sort_order: int

    class Config:
        from_attributes = True


class CategoryCreate(BaseModel):
    slug: str
    name: str
    color: str = "coral"
    description: Optional[str] = None
    sort_order: int = 0


class DifficultyOut(BaseModel):
    id: str
    slug: str
    name: str
    sort_order: int

    class Config:
        from_attributes = True


class DifficultyCreate(BaseModel):
    slug: str
    name: str
    sort_order: int = 0


class ChallengeCard(BaseModel):
    id: str
    title: str
    category: CategoryOut
    difficulty: DifficultyOut
    challenge_type: str
    points: int
    time_limit_minutes: int
    tags: Optional[str]
    lab_layer: Optional[str]

    class Config:
        from_attributes = True


class ChallengeDetail(BaseModel):
    id: str
    title: str
    description: str
    objectives: Optional[str]
    category: CategoryOut
    difficulty: DifficultyOut
    challenge_type: str
    points: int
    time_limit_minutes: int
    tags: Optional[str]
    lab_layer: Optional[str]
    vms: List[ChallengeVMOut]

    class Config:
        from_attributes = True


class ChallengeCreate(BaseModel):
    title: str
    description: str
    objectives: Optional[str] = None
    category_id: str
    difficulty_id: str
    challenge_type: str = "standard_flag"
    points: int = 100
    time_limit_minutes: int = 90
    tags: Optional[str] = None
    lab_layer: Optional[str] = None
    flag: str
    vm_template_ids: List[str] = []
    hints: List[dict] = []


# ---------- Rooms ----------
class RoomChallengeOut(BaseModel):
    order: int
    challenge: ChallengeCard

    class Config:
        from_attributes = True


class RoomOut(BaseModel):
    id: str
    slug: str
    title: str
    description: Optional[str]
    category: CategoryOut
    lab_layer: Optional[str]
    module: Optional[str]
    difficulty: str
    is_published: bool
    sort_order: int
    challenge_count: int = 0

    class Config:
        from_attributes = True


class RoomDetail(BaseModel):
    id: str
    slug: str
    title: str
    description: Optional[str]
    category: CategoryOut
    lab_layer: Optional[str]
    module: Optional[str]
    difficulty: str
    is_published: bool
    challenges: List[RoomChallengeOut]

    class Config:
        from_attributes = True


class ChallengeImport(BaseModel):
    pack: dict
    flag: str


class FlagSubmit(BaseModel):
    value: str


class FlagResult(BaseModel):
    is_correct: bool
    points_awarded: int
    message: str


# ---------- Environments / Workspace ----------
class TopologyNode(BaseModel):
    node_id: str          # client-side id from the canvas
    vm_template_id: str
    x: float
    y: float


class TopologyLink(BaseModel):
    source_node_id: str
    target_node_id: str


class TopologySave(BaseModel):
    nodes: List[TopologyNode]
    links: List[TopologyLink]


class EnvironmentVMOut(BaseModel):
    id: str
    vm_template: VMTemplateOut
    ip_address: Optional[str]
    status: str

    class Config:
        from_attributes = True


class EnvironmentOut(BaseModel):
    id: str
    challenge_id: str
    status: EnvironmentStatus
    started_at: Optional[datetime]
    expires_at: Optional[datetime]
    hints_used: int
    vms: List[EnvironmentVMOut]

    class Config:
        from_attributes = True


# ---------- Leaderboard ----------
class LeaderboardEntry(BaseModel):
    name: str
    institution: Optional[str]
    points: int


# ---------- Platform settings (centralized config) ----------
class PlatformSettingsOut(BaseModel):
    platform_name: str
    default_points: int
    default_time_limit_minutes: int
    hint_penalties_enabled: bool
    provisioning_backend: str

    class Config:
        from_attributes = True


class PlatformSettingsUpdate(BaseModel):
    platform_name: Optional[str] = None
    default_points: Optional[int] = None
    default_time_limit_minutes: Optional[int] = None
    hint_penalties_enabled: Optional[bool] = None
