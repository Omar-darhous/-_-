import test from 'node:test';
import assert from 'node:assert/strict';
import {normalize,validateQuran,names,azkar} from './data.js';
test('Arabic search ignores diacritics and alif variations',()=>assert.equal(normalize('ٱلْفَاتِحَة'),normalize('الفاتحة')));
test('incomplete or malformed Quran data must be rejected',()=>{for(const data of [null,{},[],[{number:1,ayahs:[]}],Array.from({length:114},(_,i)=>({number:i+1,ayahs:[]}))])assert.equal(validateQuran(data),false);});
test('all five dedication names are retained',()=>assert.deepEqual(names,['خالد شحاتة ابراهيم','حسن الشافعي','شحاتة ابراهيم','زينات عطية','نجية محمد']));
test('after prayer and bedtime counts are distinct',()=>{assert.equal(azkar['بعد الصلاة'][4].target,33);assert.equal(azkar['قبل النوم'][3].target,34);});
