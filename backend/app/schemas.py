"""
AutoRange Cyber Range — Pydantic Schemas
"""
from datetime import datetime
from typing import Optional, List, Any, Dict
from pydantic import BaseModel, EmailStr

from .models import (
    Role, EnvironmentStatus, QuestionType, TaskCompletionRule,
    DifficultyLevel, PublicationStatus
)


# ── Taxonomy ──────────────────────────────────────────────────────────────────

class CategoryOut(BaseModel):
    id: str
    slug: str
    name: str
    color: str
    description: Optional[str]
    sort_order: int
    class Config: from_attributes = True


class DifficultyOut(BaseModel):
    id: str
    slug: str
    name: str
    sort_order: int
    class Config: from_attributes = True


class CategoryCreate(BaseModel):
    slug: str
    name: str
    color: str = "coral"
    description: Optional[str] = None
    sort_order: int = 0


class DifficultyCreate(BaseModel):
    slug: str
    name: str
    sort_order: int = 0


# ── Auth ────────────────────────────────────────────────────────────────────

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
    class Config: from_attributes = True


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut


# ── VM Templates ─────────────────────────────────────────────────────────────

class VMTemplateOut(BaseModel):
    id: str
    name: str
    description: Optional[str]
    zone: str
    proxmox_template_id: int
    default_tools: Optional[str]
    class Config: from_attributes = True


class VMTemplateCreate(BaseModel):
    name: str
    description: Optional[str] = None
    zone: str
    proxmox_template_id: int
    default_tools: Optional[str] = None


class VMTemplateUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    zone: Optional[str] = None
    proxmox_template_id: Optional[int] = None
    default_tools: Optional[str] = None


# ── Challenges ────────────────────────────────────────────────────────────────

class ChallengeCard(BaseModel):
    """Lightweight challenge for the library listing."""
    id: str
    title: str
    description: Optional[str]
    category: CategoryOut
    difficulty: DifficultyOut
    challenge_type: str
    points: int
    time_limit_minutes: int
    tags: Optional[str]
    is_published: bool
    class Config: from_attributes = True


class ChallengeVMOut(BaseModel):
    id: str
    vm_template: VMTemplateOut
    canvas_x: int
    canvas_y: int
    class Config: from_attributes = True


class HintOut(BaseModel):
    id: str
    content: Optional[str]   # None if not yet unlocked
    cost: int
    order: int
    unlocked: bool = False
    class Config: from_attributes = True


class ChallengeDetail(BaseModel):
    id: str
    title: str
    description: Optional[str]
    objectives: Optional[str]
    category: CategoryOut
    difficulty: DifficultyOut
    challenge_type: str
    points: int
    time_limit_minutes: int
    tags: Optional[str]
    is_published: bool
    created_by: Optional[str]
    vms: List[ChallengeVMOut] = []
    hints: List[HintOut] = []
    class Config: from_attributes = True


class ChallengeCreate(BaseModel):
    title: str
    description: Optional[str] = None
    objectives: Optional[str] = None
    category_id: str
    difficulty_id: str
    challenge_type: str = "standard_flag"
    points: int = 100
    time_limit_minutes: int = 90
    tags: Optional[str] = None
    flag: str
    vm_template_ids: List[str] = []
    hints: List[Dict[str, Any]] = []


class ChallengeImport(BaseModel):
    pack: Dict[str, Any]
    flag: str


class FlagSubmit(BaseModel):
    value: str


class FlagResult(BaseModel):
    is_correct: bool
    points_awarded: int
    message: str


# ── Environments ─────────────────────────────────────────────────────────────

class EnvironmentVMOut(BaseModel):
    id: str
    vm_template: VMTemplateOut
    ip_address: Optional[str]
    proxmox_vmid: Optional[int]
    proxmox_node: Optional[str]
    status: str
    class Config: from_attributes = True


class EnvironmentOut(BaseModel):
    id: str
    room_id: str
    status: EnvironmentStatus
    started_at: Optional[datetime]
    expires_at: Optional[datetime]
    expires_at_iso: Optional[str] = None
    time_limit_minutes: int = 120
    vms: List[EnvironmentVMOut]
    class Config: from_attributes = True


class SingleVMStart(BaseModel):
    vm_template_id: str


class StopVMPayload(BaseModel):
    vm_template_id: str


# ── Question Options ──────────────────────────────────────────────────────────

class QuestionOptionOut(BaseModel):
    id: str
    text: str
    sort_order: int
    match_key: Optional[str]
    class Config: from_attributes = True


class QuestionOptionCreate(BaseModel):
    text: str
    is_correct: bool = False
    sort_order: int = 0
    match_key: Optional[str] = None


# ── Questions ─────────────────────────────────────────────────────────────────

class QuestionOut(BaseModel):
    id: str
    task_id: str
    question_type: QuestionType
    text: str
    explanation: Optional[str]
    points: int
    is_mandatory: bool
    sort_order: int
    options: List[QuestionOptionOut] = []
    # validation_data is NOT exposed to learners — only to admins
    class Config: from_attributes = True


class QuestionAdminOut(QuestionOut):
    """Full question including validation data — admin only."""
    validation_data: Optional[Dict[str, Any]]


class QuestionCreate(BaseModel):
    question_type: QuestionType = QuestionType.FLAG
    text: str
    explanation: Optional[str] = None
    points: int = 10
    is_mandatory: bool = True
    sort_order: int = 0
    validation_data: Optional[Dict[str, Any]] = None
    options: List[QuestionOptionCreate] = []


class QuestionUpdate(BaseModel):
    question_type: Optional[QuestionType] = None
    text: Optional[str] = None
    explanation: Optional[str] = None
    points: Optional[int] = None
    is_mandatory: Optional[bool] = None
    sort_order: Optional[int] = None
    validation_data: Optional[Dict[str, Any]] = None
    options: Optional[List[QuestionOptionCreate]] = None


# ── Tasks ─────────────────────────────────────────────────────────────────────

class TaskOut(BaseModel):
    id: str
    room_id: str
    title: str
    description: Optional[str]
    objectives: Optional[str]
    sort_order: int
    estimated_minutes: int
    points: int
    completion_rule: TaskCompletionRule
    min_score_pct: int
    questions: List[QuestionOut] = []
    class Config: from_attributes = True


class TaskCreate(BaseModel):
    title: str
    description: Optional[str] = None
    objectives: Optional[str] = None
    sort_order: int = 0
    estimated_minutes: int = 20
    points: int = 0
    completion_rule: TaskCompletionRule = TaskCompletionRule.ALL_QUESTIONS
    min_score_pct: int = 80


class TaskUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    objectives: Optional[str] = None
    sort_order: Optional[int] = None
    estimated_minutes: Optional[int] = None
    points: Optional[int] = None
    completion_rule: Optional[TaskCompletionRule] = None
    min_score_pct: Optional[int] = None


# ── Room VM Assignment ─────────────────────────────────────────────────────────

class RoomVMTemplateOut(BaseModel):
    id: str
    vm_template: VMTemplateOut
    sort_order: int
    class Config: from_attributes = True


# ── Rooms ─────────────────────────────────────────────────────────────────────

class RoomCard(BaseModel):
    """Lightweight room for listing."""
    id: str
    slug: str
    title: str
    description: Optional[str]
    difficulty: DifficultyLevel
    estimated_minutes: int
    tags: Optional[str]
    mitre_attack: Optional[str]
    xp_reward: int
    sort_order: int
    status: PublicationStatus
    task_count: int = 0
    vm_count: int = 0
    class Config: from_attributes = True


class RoomDetail(BaseModel):
    """Full room with tasks and VM assignments."""
    id: str
    slug: str
    module_id: str
    title: str
    description: Optional[str]
    story: Optional[str]
    objectives: Optional[str]
    difficulty: DifficultyLevel
    estimated_minutes: int
    tags: Optional[str]
    mitre_attack: Optional[str]
    prerequisites: Optional[str]
    cover_image: Optional[str]
    xp_reward: int
    sort_order: int
    status: PublicationStatus
    tasks: List[TaskOut] = []
    vm_assignments: List[RoomVMTemplateOut] = []
    class Config: from_attributes = True


class RoomCreate(BaseModel):
    slug: str
    title: str
    description: Optional[str] = None
    story: Optional[str] = None
    objectives: Optional[str] = None
    difficulty: DifficultyLevel = DifficultyLevel.MEDIUM
    estimated_minutes: int = 60
    tags: Optional[str] = None
    mitre_attack: Optional[str] = None
    prerequisites: Optional[str] = None
    cover_image: Optional[str] = None
    xp_reward: int = 0
    sort_order: int = 0
    vm_template_ids: List[str] = []


class RoomUpdate(BaseModel):
    slug: Optional[str] = None
    title: Optional[str] = None
    description: Optional[str] = None
    story: Optional[str] = None
    objectives: Optional[str] = None
    difficulty: Optional[DifficultyLevel] = None
    estimated_minutes: Optional[int] = None
    tags: Optional[str] = None
    mitre_attack: Optional[str] = None
    prerequisites: Optional[str] = None
    cover_image: Optional[str] = None
    xp_reward: Optional[int] = None
    sort_order: Optional[int] = None
    vm_template_ids: Optional[List[str]] = None


# ── Modules ───────────────────────────────────────────────────────────────────

class ModuleOut(BaseModel):
    id: str
    path_id: str
    slug: str
    title: str
    description: Optional[str]
    sort_order: int
    status: PublicationStatus
    room_count: int = 0
    rooms: List[RoomCard] = []
    class Config: from_attributes = True


class ModuleCreate(BaseModel):
    slug: str
    title: str
    description: Optional[str] = None
    sort_order: int = 0


class ModuleUpdate(BaseModel):
    slug: Optional[str] = None
    title: Optional[str] = None
    description: Optional[str] = None
    sort_order: Optional[int] = None
    status: Optional[PublicationStatus] = None


# ── Paths ─────────────────────────────────────────────────────────────────────

class PathOut(BaseModel):
    id: str
    slug: str
    title: str
    description: Optional[str]
    icon: Optional[str]
    color: str
    cover_image: Optional[str]
    sort_order: int
    status: PublicationStatus
    module_count: int = 0
    modules: List[ModuleOut] = []
    class Config: from_attributes = True


class PathCard(BaseModel):
    """Lightweight path for listing."""
    id: str
    slug: str
    title: str
    description: Optional[str]
    icon: Optional[str]
    color: str
    cover_image: Optional[str]
    sort_order: int
    status: PublicationStatus
    module_count: int = 0
    class Config: from_attributes = True


class PathCreate(BaseModel):
    slug: str
    title: str
    description: Optional[str] = None
    icon: Optional[str] = None
    color: str = "#22D3EE"
    cover_image: Optional[str] = None
    sort_order: int = 0


class PathUpdate(BaseModel):
    slug: Optional[str] = None
    title: Optional[str] = None
    description: Optional[str] = None
    icon: Optional[str] = None
    color: Optional[str] = None
    cover_image: Optional[str] = None
    sort_order: Optional[int] = None
    status: Optional[PublicationStatus] = None


# ── Progress ──────────────────────────────────────────────────────────────────

class AnswerSubmit(BaseModel):
    """Learner's answer submission for any question type."""
    value: Optional[str] = None           # plain text / flag / numeric
    data: Optional[Dict[str, Any]] = None  # structured (ordering, matching, etc.)


class AnswerResult(BaseModel):
    is_correct: bool
    points_awarded: int
    message: str
    explanation: Optional[str] = None


class UserTaskProgressOut(BaseModel):
    task_id: str
    is_completed: bool
    score: int
    max_score: int
    started_at: Optional[datetime]
    completed_at: Optional[datetime]
    class Config: from_attributes = True


class UserRoomProgressOut(BaseModel):
    room_id: str
    is_completed: bool
    score: int
    max_score: int
    tasks_done: int
    tasks_total: int
    started_at: Optional[datetime]
    completed_at: Optional[datetime]
    class Config: from_attributes = True


class UserModuleProgressOut(BaseModel):
    module_id: str
    is_completed: bool
    rooms_done: int
    rooms_total: int
    score: int
    class Config: from_attributes = True


class UserPathProgressOut(BaseModel):
    path_id: str
    is_completed: bool
    modules_done: int
    modules_total: int
    score: int
    class Config: from_attributes = True


# ── Leaderboard ───────────────────────────────────────────────────────────────

class LeaderboardEntry(BaseModel):
    name: str
    institution: Optional[str]
    points: int


# ── Platform Settings ─────────────────────────────────────────────────────────

class PlatformSettingsOut(BaseModel):
    platform_name: str
    default_task_points: int
    default_time_limit_minutes: int
    hint_penalties_enabled: bool
    provisioning_backend: str
    class Config: from_attributes = True


class PlatformSettingsUpdate(BaseModel):
    platform_name: Optional[str] = None
    default_task_points: Optional[int] = None
    default_time_limit_minutes: Optional[int] = None
    hint_penalties_enabled: Optional[bool] = None


# ── Admin Stats ───────────────────────────────────────────────────────────────

class PlatformStats(BaseModel):
    total_users: int
    learners: int
    tutors: int
    active_environments: int
    total_paths: int
    total_modules: int
    total_rooms: int
    total_tasks: int
    total_questions: int
    vm_templates: int
