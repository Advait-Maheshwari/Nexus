from dataclasses import dataclass

from fastapi import HTTPException, status


@dataclass(frozen=True)
class PlanLimits:
    projects: int
    tasks: int
    members: int


ZERO_COST_PLANS = {
    "personal_free": PlanLimits(projects=25, tasks=2_500, members=5),
}


def limits_for(plan_code: str) -> PlanLimits:
    return ZERO_COST_PLANS.get(plan_code, ZERO_COST_PLANS["personal_free"])


def require_capacity(resource: str, current: int, limit: int) -> None:
    if current >= limit:
        raise HTTPException(
            status.HTTP_409_CONFLICT,
            f"The zero-cost workspace limit for {resource} is {limit}. Archive existing data first.",
        )
