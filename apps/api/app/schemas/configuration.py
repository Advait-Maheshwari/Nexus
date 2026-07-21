from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field, model_validator


class ProjectGoal(BaseModel):
    id: str = Field(min_length=1, max_length=80)
    title: str = Field(min_length=1, max_length=220)
    measure: str = Field(min_length=1, max_length=1_000)
    completed: bool = False


class ProjectStep(BaseModel):
    id: str = Field(min_length=1, max_length=80)
    title: str = Field(min_length=1, max_length=220)
    guidance: str = Field(min_length=1, max_length=2_000)
    status: Literal["pending", "active", "done"] = "pending"
    priority: Literal["low", "medium", "high", "critical"] = "medium"


class ProjectTeam(BaseModel):
    id: str = Field(min_length=1, max_length=80)
    name: str = Field(min_length=1, max_length=160)
    lead: str = Field(min_length=1, max_length=160)
    responsibility: str = Field(min_length=1, max_length=2_000)
    task_ids: list[str] = Field(default_factory=list, max_length=500)


class ProjectBlueprintWrite(BaseModel):
    version: int = Field(default=0, ge=0)
    vision: str = Field(min_length=1, max_length=10_000)
    definition_of_done: str = Field(min_length=1, max_length=10_000)
    strategy: str = Field(min_length=1, max_length=10_000)
    constraints: list[str] = Field(default_factory=list, max_length=100)
    goals: list[ProjectGoal] = Field(default_factory=list, max_length=100)
    steps: list[ProjectStep] = Field(default_factory=list, max_length=100)
    teams: list[ProjectTeam] = Field(default_factory=list, max_length=100)

    @model_validator(mode="after")
    def validate_identity_and_assignments(self) -> "ProjectBlueprintWrite":
        for label, values in (
            ("goal", [item.id for item in self.goals]),
            ("step", [item.id for item in self.steps]),
            ("team", [item.id for item in self.teams]),
        ):
            if len(values) != len(set(values)):
                raise ValueError(f"Duplicate {label} identifiers are not allowed")

        assignments = [task_id for team in self.teams for task_id in team.task_ids]
        if len(assignments) != len(set(assignments)):
            raise ValueError("A task can be assigned to only one team")
        if any(
            not constraint.strip() or len(constraint) > 1_000 for constraint in self.constraints
        ):
            raise ValueError("Constraints must contain 1 to 1000 characters")
        return self


class ProjectBlueprintRead(ProjectBlueprintWrite):
    project_id: str
    workspace_id: str
    version: int
    updated_at: datetime


class UserPreferencesWrite(BaseModel):
    reduced_motion: bool = False
    compact_interface: bool = False
    auto_briefing: bool = True


class UserPreferencesRead(UserPreferencesWrite):
    updated_at: datetime
