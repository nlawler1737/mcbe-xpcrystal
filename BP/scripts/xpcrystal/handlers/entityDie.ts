import { Player, Entity, ItemStack, EntityItemComponent, EntityDieAfterEvent } from "@minecraft/server"
import { MAX_XP_STORAGE } from "../constants"
import XpCrystalItemStack from "../classes/XpCrystalItemStack"

export function entityDie(event: EntityDieAfterEvent) {
    if (event.deadEntity.typeId !== "minecraft:player") return
    const player = event.deadEntity as Player;
    const location = player.getHeadLocation()
    const xpCrystals = player.dimension.getEntities({ type: "minecraft:item", location, maxDistance: 1 })
        .reduce((prev, entity) => {
            const itemComp = entity.getComponent("minecraft:item") as EntityItemComponent;
            const item = itemComp.itemStack
            if (item.typeId === "xpcrystal:xpcrystal") prev.push({ entity, item, xpCrystal: new XpCrystalItemStack(item) })
            return prev
        }, [] as { entity: Entity, item: ItemStack, xpCrystal: XpCrystalItemStack }[])
        .sort((a, b) => {
            return b.xpCrystal.xp - a.xpCrystal.xp
        })

    const level = player.level
    const xpDroppedOnDeath = Math.min(7 * level, 100)
    let xpToStore = player.getTotalXp() - xpDroppedOnDeath

    for (let i = 0; i < xpCrystals.length && xpToStore > 0; i++) {
        const crystal = xpCrystals[i]
        const currentXpValue = crystal.xpCrystal.xp
        const canStore = Math.min(xpToStore, MAX_XP_STORAGE - currentXpValue)

        crystal.xpCrystal.addExperience(canStore)

        const newEntity = player.dimension.spawnItem(crystal.item, crystal.entity.location)
        newEntity.applyImpulse(crystal.entity.getVelocity())
        crystal.entity.remove()
        xpToStore -= canStore
    }
}

export default entityDie