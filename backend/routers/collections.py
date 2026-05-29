from fastapi import APIRouter, HTTPException
import server

router = APIRouter(tags=["Collections"])

@router.get("/collections")
async def get_collections():
    collections = await server.db.collections.find({}, {"_id": 0}).to_list(20)
    return collections

@router.get("/collections/{collection_id}")
async def get_collection(collection_id: str):
    collection = await server.db.collections.find_one({"collection_id": collection_id}, {"_id": 0})
    if not collection:
        raise HTTPException(status_code=404, detail="Collection not found")
    tools = await server.db.tools.find({"tool_id": {"$in": collection.get("tools", [])}}, {"_id": 0}).to_list(20)
    return {"collection": collection, "tools": tools}
