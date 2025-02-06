import { world, ItemCustomComponent } from "@minecraft/server"
import { xpCrystalUse } from "./handlers/index"

const XpCrystalItemComponent: ItemCustomComponent = {
    onUse: xpCrystalUse,
}

world.beforeEvents.worldInitialize.subscribe((event) => {
    event.itemComponentRegistry.registerCustomComponent(
        "xpcrystal:xpcrystal",
        XpCrystalItemComponent
    )
})

world.afterEvents.entityDie.subscribe((event) => {
    if (event.deadEntity.typeId !== "minecraft:player") return
    const player = event.deadEntity as Player;
    const location = player.getHeadLocation()
    const xpCrystals = player.dimension.getEntities({ type: "minecraft:item", location, maxDistance: 1 })
        .reduce((prev, entity) => {
            const itemComp = entity.getComponent("minecraft:item") as EntityItemComponent;
            const item = itemComp.itemStack
            if (item.typeId === "xpcrystal:xpcrystal") prev.push({ entity, item })
            return prev
        }, [] as { entity: Entity, item: ItemStack }[])
        .sort((a, b) => {
            return getCurrentXpValue(b.item) - getCurrentXpValue(a.item)
        })

    const level = player.level
    const xpDroppedOnDeath = Math.min(7 * level, 100)
    let xpToStore = player.getTotalXp() - xpDroppedOnDeath

    for (let i = 0; i < xpCrystals.length && xpToStore > 0; i++) {
        const crystal = xpCrystals[i]
        const currentXpValue = getCurrentXpValue(crystal.item)
        const canStore = Math.min(xpToStore, MAX_XP_STORAGE - currentXpValue)

        updateXpValue(crystal.item, canStore, false)
        const newEntity = player.dimension.spawnItem(crystal.item, crystal.entity.location)
        newEntity.applyImpulse(crystal.entity.getVelocity())
        crystal.entity.remove()
        xpToStore -= canStore
    }
})
