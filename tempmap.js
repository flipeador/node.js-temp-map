"use strict";

const { setTimeout, clearTimeout } = require('node:timers');

function getValue(fn, ...args)
{
    return typeof(fn) === 'function' ? fn(...args) : fn;
}

/**
 * Get the timeout of an item, and adjusts it if necessary.
 * @param {Object} item The item.
 * @param {Boolean} remaining Whether to determine the remaining timeout.
 * @returns {undefined|null|Number}
 * - Returns the timeout if the item has a valid timer.
 * - Returns `undefined` if the item does not have a timer.
 * - Returns `null` if the item's timeout has expired.
 */
function getItemTimeout(item, remaining)
{
    if (!item?.timer || !remaining)
        return item?.timer?.timeout;
    const timeout = item.timer.timeout - (Date.now() - item.timer.timestamp);
    return timeout > 0 ? timeout : null;
}

/**
 * Refresh the timeout of an item and returns it.
 * @param {Object} item The item.
 */
function refreshItemTimeout(item)
{
    if (item?.timer)
    {
        item.timer.timer.refresh();
        item.timer.timestamp = Date.now();
    }
    return item;
}

/**
 * A Map with temporary elements and additional utility methods.
 */
class TempMap extends Map
{
    /**
     * Get the element at a given index, allowing for positive and negative integers.
     * @param {Number} index The index of the element to obtain.
     * @param {Boolean} refreshTimeout Whether to refresh the element's timeout.
     * @return The key/value pair at the specified pos, or `undefined` if the element does not exist.
     */
    at(index, refreshTimeout=true)
    {
        if (index < 0)
            index = super.size + index;
        let i = 0;
        for (const [key, item] of super.entries())
            if (index === i++)
                return refreshTimeout
                    ? [key, refreshItemTimeout(item).value]
                    : [key, item.value];
    }

    /**
     * Get an element from the map.
     * @param key The key associated with the element.
     * @param {Boolean} refreshTimeout Whether to refresh the element's timeout.
     * @return The element associated with the specified key, or `undefined` if the element does not exist.
     */
    get(key, refreshTimeout=true)
    {
        return this.#getItem(key, refreshTimeout)?.value;
    }

    /**
     * Get an element from the map if it exists, otherwise sets and returns `defaultValue`.
     * @param key The key associated with the element.
     * @param defaultValue The default value or a `function(key,map)` that generates it.
     * @param {undefined|Number} timeout The timeout, in milliseconds. See `TempMap.set`.
     * @param {Boolean} refreshTimeout Whether to refresh the element's timeout, if it exists.
     * @return The element associated with the specified key, or `defaultValue` if the element does not exist.
     */
    ensure(key, defaultValue, timeout, refreshTimeout=true)
    {
        const item = this.#getItem(key, refreshTimeout);
        if (item) return item.value;
        return this.#setItem(key, null, getValue(defaultValue, key, this), timeout);
    }

    /**
     * Add or update an element from the map.
     * @param key The key associated with the element.
     * @param value The value of the element.
     * @param {undefined|null|Number} timeout
     * Timeout, in milliseconds. Once the time elapses, the element is deleted.
     * The timer of each element can be reset by setting `refreshTimeout` when retrieving.
     * If the element does not exist; `undefined`, `null`, zero or a negative number adds the element without a timer.
     * - If the element already exists:
     *   - Specify zero or a negative number to delete the timer.
     *   - Specify `undefined` to refresh the timer. This is the default.
     *   - Specify `null` to keep the currently assigned timer.
     * @return Returns the specified `value`.
     */
    set(key, value, timeout)
    {
        return this.#setItem(key, super.get(key), value, timeout);
    }

    /**
     * Add a new element to the map.
     * @param key The key associated with the element.
     * @param value The value of the new element to be added.
     * @param {undefined|Number} timeout The timeout, in milliseconds. See `TempMap.set`.
     * @return Returns the specified `value`, or `undefined` if the element already exists.
     */
    add(key, value, timeout)
    {
        const item = super.get(key);
        if (item) return undefined;
        return this.#setItem(key, null, value, timeout);
    }

    /**
     * Update an existing element from the map.
     * @param key The key associated with the element.
     * @param value The new value of the element.
     * @param {undefined|Number} timeout The timeout, in milliseconds. See `TempMap.set`.
     * @return Returns the specified `value`, or `undefined` if the element does not exist.
     */
    update(key, value, timeout)
    {
        const item = super.get(key);
        if (!item) return undefined;
        return this.#setItem(key, item, value, timeout);
    }

    /**
     * Delete an element from the map.
     * @return The deleted element, or `undefined` if the element does not exist.
     */
    delete(key)
    {
        return this.#deleteItem(key, super.get(key))?.value;
    }

    /**
     * Delete elements that satisfy the provided filter function.
     * @param {Function} fn `Function(value,key,map)` used to test.
     * @return The number of deleted elements.
     */
    sweep(fn)
    {
        const size = this.size;
        for (const [key, item] of super.entries())
            if (fn(item.value, key, this))
                this.#deleteItem(key, item);
        return size - this.size;
    }

    /**
     * Delete all the elements from the map.
     * @return {Number} The number of deleted elements.
     */
    clear()
    {
        return this.sweep(() => true);
    }

    /**
     * Check if the map shares identical elements with another.
     * @param {TempMap} other The other map to compare with.
     * @return {Boolean} Whether the maps have identical contents.
     */
    equals(other)
    {
        if (this === other) return true;
        if (!(other instanceof TempMap) || other.size !== super.size)
            return false;
        for (const [key, item] of super.entries())
        {
            const otherItem = other.#getItem(key);
            if (!otherItem || !Object.is(otherItem.value, item.value))
                return false;
        }
        return true;
    }

    /**
     * Check if all the specified elements passes a test function.
     * @param {Function} fn `Function(value,key,map)` used to test.
     */
    every(fn)
    {
        for (const [key, item] of super.entries())
            if (!fn(item.value, key, this))
                return false;
        return true;
    }

    /**
     * Check if all of the specified elements exist.
     * @param keys The keys of the elements to check for.
     * @return Returns `true` if all of the elements exist, `false` if at least one does not exist.
     */
    hasAll(...keys)
    {
        return keys.every(key => this.has(key));
    }

    /**
     * Check if any of the specified elements exist.
     * @param keys The keys of the elements to check for.
     * @return Returns `true` if any of the elements exist, `false` if none exist.
     */
    hasAny(...keys)
    {
        return keys.some(key => this.has(key));
    }

    /**
     * Search for a single element that pass the test function.
     * @param {Function} fn `Function(value,key,map)` used to test.
     * @return The key/value pair found, otherwise `undefined`.
     */
    find(fn)
    {
        for (const [key, item] of super.entries())
            if (fn(item.value, key, this))
                return [key, item.value];
    }

    /**
     * Get the first element(s) from the map, in insertion order.
     * @param {Number} count The number of elements to get.
     * @return An array with key/value pair for each element found.
     */
    first(count=1)
    {
        const items = [];
        let index = 0;
        for (const [key, item] of super.entries())
            if (index++ >= count) break;
            else items.push([key, item.value]);
        return items;
    }

    /**
     * Get the last element(s) from the map, in insertion order.
     * @param {Number} count The number of elements to get.
     * @return An array with key/value pair for each element found.
     */
    last(count=1)
    {
        const items = [];
        let index = 0;
        for (const [key, item] of super.entries())
            if (index++ >= this.size - count)
                items.push([key, item.value]);
        return items;
    }

    /**
     * Create an identical shallow copy of the map.
     * @param {Boolean} refreshTimeout Whether to refresh timeout for the copied elements.
     */
    clone(refreshTimeout=true)
    {
        const map = new TempMap();
        for (const [key, item] of super.entries())
            map.#copyItem(key, item, false, refreshTimeout);
        return map;
    }

    /**
     * Maps each element in the map to another value into an array.
     * @param {Function} fn `Function(value,key,map)` that produces an element of the new array.
     */
    map(fn)
    {
        const iter = super.entries();
        return Array.from({ length: this.size }, () => {
            const [key, item] = iter.next().value;
            return fn(item.value, key, this);
        });
    }

    /**
     * Create a map containing a shallow copy of the elements that pass the test function.
     * @param {Function} fn `Function(value,key,map)` used to test.
     * @param {Boolean} refreshTimeout Whether to refresh timeout for the copied elements.
     */
    filter(fn, refreshTimeout=true)
    {
        const map = new TempMap();
        for (const [key, item] of super.entries())
            if (fn(item.value, key, this))
                map.#copyItem(key, item, false, refreshTimeout);
        return map;
    }

    /**
     * Create a map containing a shallow copy of the elements whose keys are not present between the two maps.
     * @param {TempMap} other The other map whose elements are to be copied.
     * @param {Boolean} refreshTimeout Whether to refresh timeout for the copied elements.
     */
    difference(other, refreshTimeout=true)
    {
        return this.filter((_, key) => {
            return !other.has(key);
        }, refreshTimeout).concat(
            other.filter((_, key) => {
                return !this.has(key);
            }, refreshTimeout)
        );
    }

    /**
     * Create a map containing a shallow copy of the elements that are present in both maps.
     * @param {TempMap} other The other map whose elements are to be copied.
     * @param {Boolean} refreshTimeout Whether to refresh timeout for the copied elements.
     */
    intersect(other, refreshTimeout=true)
    {
        return this.filter((value, key) => {
            const item = other.#getItem(key);
            return item && Object.is(value, item.value);
        }, refreshTimeout);
    }

    /**
     * Partition the map into two maps where the first contains the elements that passed and the second contains the items that failed.
     * @param {Function} fn `Function(value,key,map)` used to test.
     * @param {Boolean} refreshTimeout Whether to refresh timeout for the copied elements.
     */
    partition(fn, refreshTimeout=true)
    {
        const maps = [new TempMap(), new TempMap()];
        for (const [key, item] of super.entries())
            maps[fn(item.value, key, this) ? 0 : 1]
                .#copyItem(key, item, false, refreshTimeout);
        return maps;
    }

    /**
     * Combine the map with a shallow copy of the elements from another map.
     * @param {TempMap} other The other map whose elements are to be combined.
     * @param {Boolean} refreshTimeout Whether to refresh timeout for the copied elements.
     */
    concat(other, refreshTimeout=true)
    {
        if (this === other) return this;
        for (const [key, item] of other.#iter())
            this.#copyItem(key, item, true, refreshTimeout);
        return this;
    }

    /**
     * Sort the elements in place and returns the map.
     * @param {Function} fn `Function(firstValue,secondValue,firstKey,secondKey)` that defines the sort order.
     * @param {Boolean} refreshTimeout Whether to refresh timeout for the copied elements.
     */
    sort(fn, refreshTimeout=true)
    {
        fn ??= TempMap.defaultSort;
        const entries = [...super.entries()];
        entries.sort((a, b) => fn(a[1].value, b[1].value, a[0], b[0]));
        this.clear();
        for (const [key, item] of entries)
            this.#copyItem(key, item, false, refreshTimeout);
        return this;
    }

    /**
     * Returns an iterable of values for every entry in the map, in insertion order.
     */
    *values()
    {
        for (const item of super.values())
            yield item.value;
    }

    /**
     * Returns an iterable of key/value pairs for every entry in the map, in insertion order.
     */
    *entries()
    {
        for (const [key, item] of super.entries())
            yield [key, item.value];
    }

    /**
     * Executes a provided function once per each key/value pair in the map, in insertion order.
     * @param {Function} fn `Function(value,key,map)` to execute for each entry in the map.
     * @param thisArg Value to use as `this` when executing `fn`.
     */
    forEach(fn, thisArg)
    {
        if (thisArg) fn = fn.bind(thisArg);
        for (const [key, value] of this.entries())
            fn(key, value, this);
        return this;
    }

    /**
     * Get a string representation of all the elements in the map.
     */
    toString(sep=' ', filter, map)
    {
        let str = '';
        for (const [key, value] of this.entries())
            if (!filter || filter(value, key, this))
                str += map
                    ? `${map(value, key, this)}${sep}`
                    : `${value}${sep}`;
        return sep.length ? str.slice(0, -sep.length) : str;
    }

    /**
     * Print to `stdout` all the elements in the map, for debugging purposes.
     */
    debug()
    {
        console.log(`${this.constructor.name}[${super.size}]:`);
        for (const [key, item] of super.entries())
            console.log('>', key, item);
    }

    *[Symbol.iterator]()
    {
        yield * this.entries();
    }

    *[Symbol.asyncIterator]()
    {
        for (const item of this.entries())
            yield Promise.resolve(item);
    }

    *#iter()
    {
        yield * super.entries();
    }

    #getItem(key, refreshTimeout)
    {
        return refreshTimeout
            ? refreshItemTimeout(super.get(key))
            : super.get(key);
    }

    #setItem(key, item, value, timeout)
    {
        if (item)
        {
            item.value = value;
            if (typeof(timeout) === 'number')
            {
                clearTimeout(item.timer?.timer);
                this.#setTimeout(key, item, timeout);
            }
            else if (item.timer && timeout === undefined)
                refreshItemTimeout(item);
        }
        else
            super.set(key, this.#setTimeout(key, {value}, timeout??0));
        return value;
    }

    #copyItem(key, item, ensure, refreshTimeout)
    {
        const timeout = getItemTimeout(item, !refreshTimeout);
        return timeout === null ? undefined : ensure
            ? this.ensure(key, ()=>item.value, timeout)
            : this.set(key, item.value, timeout);
    }

    #deleteItem(key, item)
    {
        if (item && super.delete(key))
            clearTimeout(item.timer?.timer);
        return item;
    }

    #setTimeout(key, item, timeout)
    {
        if (timeout > 0)
        {
            item.timer = {
                timer: setTimeout(() => {
                    super.delete(key);
                }, timeout),
                timeout: timeout,
                timestamp: Date.now()
            };
        } else
            delete item.timer;
        return item;
    }

    /**
     * Default sort according to each character's Unicode code point value, according to the string conversion of each element.
     */
    static defaultSort(firstValue, secondValue)
    {
        return Number(firstValue > secondValue) || Number(firstValue === secondValue) - 1;
    }
}

module.exports = TempMap;
