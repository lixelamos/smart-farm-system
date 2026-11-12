import {test} from 'node:test';
import assert from 'node:assert/strict';
import {phpEndpoint} from '../../lib/php-backend';
const original={...process.env};
test('PHP endpoint keeps credentials server-side and controls the routed path',()=>{try{Object.assign(process.env,{PHP_API_URL:'https://backend.example/api.php',PHP_API_KEY:'a'.repeat(64)});const url=phpEndpoint('data/farmers',new URLSearchParams('route=login&after=4'));assert.equal(url.searchParams.get('route'),'data/farmers');assert.equal(url.searchParams.get('after'),'4');assert(!url.toString().includes('a'.repeat(64)));}finally{process.env=original;}});
test('production refuses HTTP backend URLs',()=>{try{Object.assign(process.env,{NODE_ENV:'production',PHP_API_URL:'http://localhost:8080/api.php',PHP_API_KEY:'a'.repeat(64)});assert.throws(()=>phpEndpoint('me'),/HTTPS/);}finally{process.env=original;}});
test('an example placeholder cannot be used as the API key',()=>{try{Object.assign(process.env,{PHP_API_URL:'https://backend.example/api.php',PHP_API_KEY:'REPLACE_WITH_A_PRIVATE_KEY'});assert.throws(()=>phpEndpoint('me'),/Configure/);}finally{process.env=original;}});
