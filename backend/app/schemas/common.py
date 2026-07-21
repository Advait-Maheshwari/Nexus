from datetime import datetime

from pydantic import BaseModel, ConfigDict


class EntityRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    workspace_id: str
    created_at: datetime
    updated_at: datetime

