import { Player, Dimension, Vector3, ContainerSlot, EntityEquippableComponent, EquipmentSlot } from "@minecraft/server"

export function getExperienceNeededForNextLevel(level: number) {
    if (level < 0) {
        return 0
    } else if (level <= 15) {
        return 2 * level + 7
    } else if (level <= 30) {
        return 5 * level - 38
    } else {
        return 9 * level - 158
    }
}

/**
 * Rounds a percent to the nearest whole number,
 * but it will only return 0 or 100 if `percent`
 * are exactly 100 or 0. Everything else will be
 * rounded as normal.
 * 
 * @param percent should be a float in range [0,100]
 * 
 * @return number Returns a whole number
 * 
 * ```
 * getDisplayPercent(100) // 100
 * getDisplayPercent(99.99) // 99
 * getDisplayPercent(0) // 0
 * getDisplayPercent(0.01) // 1
 * ```
 */
export function getDisplayPercent(percent: number) {
    if (percent < 100 && percent >= 99) {
        return 99
    }
    if (percent > 0 && percent <= 1) {
        return 1
    }
    return Math.round(percent)
}

export function getMainhandSlot(player: Player): ContainerSlot {
    const equipComp = player.getComponent("minecraft:equippable") as EntityEquippableComponent
    try {
        const slot = equipComp.getEquipmentSlot(EquipmentSlot.Mainhand)
        return slot
    } catch (e) {
        return null
    }
}

export function distance(v1: Vector3, v2: Vector3) {
    const dx = v2.x - v1.x;
    const dy = v2.y - v1.y;
    const dz = v2.z - v1.z;
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

export function* spawnXpOrbs(dimension: Dimension, count: number, location: Vector3) {
    for (let i = 0; i < count; i++) {
        const loc = { ...location }
        loc.x += getRandomInRange(-0.5, 0)
        loc.y += getRandomInRange(0, 0.25)
        loc.z += getRandomInRange(-0.25, 0.25)
        dimension.spawnEntity("minecraft:xp_orb", loc)
        yield
    }
}

export function getRandomInRange(min: number, max: number) {
    return Math.random() * (max - min) + min;
}