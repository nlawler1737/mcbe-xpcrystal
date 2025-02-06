import { world, ItemCustomComponent } from "@minecraft/server"
import { xpCrystalUse, entityDie } from "./handlers/index"

const XpCrystalItemComponent: ItemCustomComponent = {
    onUse: xpCrystalUse,
}

world.beforeEvents.worldInitialize.subscribe((event) => {
    event.itemComponentRegistry.registerCustomComponent(
        "xpcrystal:xpcrystal",
        XpCrystalItemComponent
    )
})

world.afterEvents.entityDie.subscribe(entityDie)
