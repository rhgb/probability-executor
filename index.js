'use strict';
/**
 * app user visit probability distribution
 * @type {number[]}
 */
exports.PROB_USER_VISIT = [30, 20, 15, 8, 7, 7, 8, 27, 69, 67, 62, 92, 349, 409, 214, 133, 138, 186, 270, 378, 393, 280, 120, 68];
/**
 * staff activity probability distribution
 * @type {[*]}
 */
exports.PROB_STAFF_ACTIVITY = [1, 1, 1, 0, 0, 0, 0, 0, 0, 1, 4, 7, 7, 5, 7, 8, 10, 9, 8, 6, 5, 5, 3, 1];
/**
 *
 * @param {Iterator} iterator or iterator
 * @param {number} targetCount
 * @param {number[]} probability
 */
exports.execute = function (iterator, targetCount, probability) {
    let lambdaInvSeq = genLambdaInvSeq(targetCount, probability);
    let dailySeq = genDailySeq(lambdaInvSeq);
    exec(dailySeq, iterator);
};

exports.getIntervalGenerator = function * (targetCount, probability) {
    let lambdaInvSeq = genLambdaInvSeq(targetCount, probability);
    for (;;) {
        const lambdaInv = lambdaInvSeq[new Date().getHours()];
        yield Math.round(expRand(lambdaInv))
    }
};

/**
 *
 * @param {number} lambdaInv
 * @returns {number}
 */
function expRand(lambdaInv) {
    return -Math.log(1 - Math.random()) * lambdaInv;
}

/**
 *
 * @param {number} lambdaInv
 * @param {number} start
 * @returns {{seq: Array, exceeded: number}}
 */
function genHourSeq(lambdaInv, start = 0) {
    if (!lambdaInv) {
        return {
            seq: [3600000],
            exceeded: start
        }
    }
    let sum = 0, seq = [];
    let total = 3.6e6 - start;
    while (sum < total) {
        let next = Math.round(expRand(lambdaInv));
        sum += next;
        seq.push(next);
    }
    return {
        seq,
        exceeded: sum - total
    }
}

/**
 *
 * @param {number} targetCount
 * @param {number[]} probability
 * @returns {number[]}
 */
function genLambdaInvSeq(targetCount, probability) {
    const probSum = probability.reduce((sum, p) => sum + p, 0);
    return probability.map(p => p === 0 ? null : 3.6e6 / targetCount * probSum / p);
}

/**
 *
 * @param {number[]} lambdaInvSeq
 * @returns {Array}
 */
function genDailySeq(lambdaInvSeq) {
    let daySeq = [], start = 0;
    for (let lambdaInv of lambdaInvSeq) {
        let hourSeq = genHourSeq(lambdaInv, start);
        daySeq = daySeq.concat(hourSeq.seq);
        start = hourSeq.exceeded;
    }

    let acc = [], sum = 0;
    for (let interval of daySeq) {
        sum += interval;
        if (sum > 86400000) break;
        acc.push(sum);
    }
    return acc;
}
/**
 *
 * @param {number[]} dailySeq
 * @param {Iterator} iterator
 */
function exec(dailySeq, iterator) {
    let baseTime = getStartOfDay(Date.now());
    let diff = Date.now() - baseTime;
    let nextId = binSearch(dailySeq, diff);
    if (nextId >= dailySeq.length) {
        nextId = 0;
        baseTime += 86400000;
    }

    const runNext = () => {
        let timeout = baseTime + dailySeq[nextId] - Date.now();
        if (timeout < 0) timeout = 0;
        setTimeout(() => {
            const res = iterator.next();
            if (!res.done) {
                nextId++;
                if (nextId >= dailySeq.length) {
                    nextId = 0;
                    baseTime += 86400000;
                }
                runNext();
            }
        }, timeout);
        // console.log(`time: ${(Date.now() - baseTime) / 1000}, timeSegment: ${dailySeq[nextId] / 1000}, eventId: ${nextId}`);
    };

    runNext();
}

/**
 *
 * @param {number} time
 * @returns {number}
 */
function getStartOfDay(time) {
    let dayStart = new Date(time);
    dayStart.setHours(0);
    dayStart.setMinutes(0);
    dayStart.setSeconds(0);
    dayStart.setMilliseconds(0);
    return dayStart.getTime();
}

/**
 *
 * @param {number[]} arr
 * @param {number} n
 * @returns {number}
 */
function binSearch(arr, n) {
    if (arr.length <= 2) {
        for (let i = 0; i < arr.length; i++) {
            if (n <= arr[i]) return i;
        }
        return arr.length;
    }
    const id = Math.floor(arr.length / 2);
    if (n === arr[id]) return id;
    if (n < arr[id]) return binSearch(arr.slice(0, id), n);
    return binSearch(arr.slice(id + 1), n) + id + 1;
}