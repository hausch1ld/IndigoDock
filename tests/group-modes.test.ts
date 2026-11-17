import {test} from 'node:test';
import assert from 'node:assert/strict';
import {defaults} from '../src/main/registry';
import {configSchema,commandSchema} from '../src/shared/model';
import {createEmptyGroup} from '../src/shared/groups';
test('legacy groups acquire an icon and presentation defaults without changing profiles or layouts',()=>{
 const c=defaults();createEmptyGroup(c,'g',3);const raw=JSON.parse(JSON.stringify(c));delete raw.settings.groupMode;delete raw.groups[0].icon;
 const parsed=configSchema.parse(raw);assert.equal(parsed.settings.groupMode,'icon-group');assert.equal(parsed.groups[0].icon,'columns');assert.deepEqual(parsed.services,c.services);assert.deepEqual(parsed.groups[0].layout,c.groups[0].layout);
});
test('group modes and icon commands accept only supported values',()=>{
 const c=defaults();for(const groupMode of ['icon-group','group-only','icon-only'])assert.equal(configSchema.parse({...c,settings:{...c.settings,groupMode}}).settings.groupMode,groupMode);
 assert.equal(commandSchema.safeParse({type:'groupIcon',id:'g',icon:'heart'}).success,true);
 assert.equal(commandSchema.safeParse({type:'groupIcon',id:'g',icon:'<script>'}).success,false);
 assert.equal(commandSchema.safeParse({type:'infoLink',page:'https://example.com'}).success,false);
});
