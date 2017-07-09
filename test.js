'use strict';
const Executor = require('./index');
const probability = Array.from(new Array(24)).map(x => 1);
const targetCount = 10000;

function * genNums() {
    for (let i = 0; i < targetCount; i++) {
        yield i;
    }
}

Executor.execute(genNums(), targetCount, probability);
