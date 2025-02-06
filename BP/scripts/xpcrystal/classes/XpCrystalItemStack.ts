import { ContainerSlot, ItemStack } from "@minecraft/server"
import { getDisplayPercent } from "../utils"
import { EXPERIENCE_DYNAMIC_ID, STOREAGE_LORE_ID, MAX_XP_STORAGE } from "../constants"

export class XpCrystalItemStack {
    #slot: ContainerSlot
    #item: ItemStack
    #crystal: ContainerSlot | ItemStack;
    #xpLore: string;

    constructor(xpCrystal: ContainerSlot | ItemStack) {
        if (xpCrystal instanceof ContainerSlot) {
            if (xpCrystal.getItem().typeId !== "xpcrystal:xpcrystal") {
                throw new Error("'xpCrystal' must be of type 'xpcrystal:xpcrystal'")
            }
            this.#slot = xpCrystal
        } else {
            if (xpCrystal.typeId !== "xpcrystal:xpcrystal") {
                throw new Error("'xpCrystal' must be of type 'xpcrystal:xpcrystal'")
            }
            this.#item = xpCrystal
        }
        this.#crystal = xpCrystal
    }

    get xp() {
        const val = this.#crystal.getDynamicProperty(EXPERIENCE_DYNAMIC_ID) as number;
        if (val == undefined) {
            this.#crystal.setDynamicProperty(EXPERIENCE_DYNAMIC_ID, 0)
            return 0
        }
        return val
    }

    get xpLore() {
        return this.#xpLore
    }

    get slot() {
        return this.#slot
    }

    get item() {
        return this.#item
    }

    addExperience(add: number) {
        return this.setExperience(this.xp + add)
    }

    setExperience(value: number) {
        const newValue = Math.min(Math.max(value, 0), MAX_XP_STORAGE)
        const added = newValue - this.xp

        this.#updateXp(newValue)
        return {
            added,
            xp: newValue
        }
    }

    /**
     * Updates the item's dynamic property of `EXPERIENCE_DYNAMIC_ID`
     * and the item's lore using `xp`
     * 
     * `set` is used to set the xp value or add to the current value
     * 
     * `set` is `true` by default
     * 
     * @returns updated crystal lore string
     */
    #updateXp(xp: number, set = true) {
        if (set) {
            this.#crystal.setDynamicProperty(EXPERIENCE_DYNAMIC_ID, xp)
        } else {
            this.#crystal.setDynamicProperty(EXPERIENCE_DYNAMIC_ID, this.xp + xp)
        }
        return this.#updateLore()
    }

    /**
     * Sets the experience lore of `this.#item`
     * 
     * Uses the item's dynamic property of `EXPERIENCE_DYNAMIC_ID`
     * to set the value
     * 
     * @returns new lore string for item
     */
    #updateLore() {
        const currentXpValue = this.xp;
        this.#xpLore = this.#getXpStorageLoreString(currentXpValue)
        this.#crystal.setLore([this.#xpLore])
        return this.#xpLore
    }

    #getXpStorageLoreString(value: number) {
        const percent = getDisplayPercent((value / MAX_XP_STORAGE) * 100)
        let color: string;
        if (percent === 100) {      // 100
            color = "b"
        } else if (percent === 0) { // 0
            color = "n"
        } else if (percent > 90) {  // 91 - 99
            color = "a"
        } else if (percent > 70) {  // 71 - 90
            color = "e"
        } else if (percent > 50) {  // 51 - 70
            color = "g"
        } else if (percent > 30) {  // 31 - 50
            color = "6"
        } else if (percent > 10) {  // 11 - 30
            color = "v"
        } else {                    // 1 - 10
            color = "c"
        }
        const str = `${STOREAGE_LORE_ID}§7XP: §${color}${percent}% §7(${value} / ${MAX_XP_STORAGE})`
        return str
    }
}

export default XpCrystalItemStack