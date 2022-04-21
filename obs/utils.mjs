export function randomFromWeights(elements) {
    let totalWeight = 0

    for (const w of elements) {
        totalWeight += w.probability
    }

    let random = Math.floor(Math.random() * totalWeight)

    for (let i = 0; i < elements.length; i++) {
        random -= elements[i].probability

        if (random < 0) {
            return elements[i]
        }
    }
}