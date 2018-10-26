// Ждет появление элемента с заданным селектором и кликает по нему.
const waitAndClick = async (page, selector) => {
    // Если использовать ElementHandle, возвращаемый из waitForSelector,
    // К пр.: await (await page.waitForSelector(selector)).click();
    // можно столкнуться с ошибкой "Error: Node is detached from document",
    // такое бывает если Реакт перерендорил компонент или что-то подобное.
    // Поэтому отдельно ждем и отдельно кликаем.
    await page.waitForSelector(selector)
    await page.click(selector);
}

module.exports = {
    waitAndClick
};
