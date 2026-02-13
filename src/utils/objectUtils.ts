/**
 * Atualiza um valor em um objeto profundamente usando um caminho de string (ex: 'a.b.c').
 */
export const updateDeep = (obj: any, path: string[], val: any): any => {
    const [head, ...tail] = path;
    if (tail.length === 0) {
        return { ...obj, [head]: val };
    }
    return {
        ...obj,
        [head]: updateDeep(obj[head] || {}, tail, val)
    };
};
