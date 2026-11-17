import {test} from 'node:test';
import assert from 'node:assert/strict';
import {defaults} from '../src/main/registry';
import {selectApps,createEmptyGroup,fillGroupSlot,activateGroup,saveGroup} from '../src/shared/groups';
import {newInstance,sessionProfile} from '../src/shared/profiles';
import {configSchema,commandSchema} from '../src/shared/model';
import {parseForecast} from '../src/main/weather';
test('multi-selection creates exactly the selected columns; solo clears group selection',()=>{
 const c=defaults();selectApps(c,['steam','discord']);assert.equal(c.count,2);saveGroup(c,'g');
 selectApps(c,['gmail']);assert.equal(c.count,1);assert.equal(c.activeGroup,null);assert.deepEqual(c.layouts[1].columns[0].services,['gmail']);
 activateGroup(c,'g');assert.equal(c.count,2);assert.throws(()=>selectApps(c,['steam','steam']));
});
test('empty groups persist and filling slots moves instances without deleting other slots',()=>{
 const c=defaults();createEmptyGroup(c,'g',3);fillGroupSlot(c,'g',2,'steam');fillGroupSlot(c,'g',0,'steam');
 assert.equal(c.groups[0].layout.columns[2].active,null);assert.equal(c.groups[0].layout.columns[0].active,'steam');
 createEmptyGroup(c,'h',2);fillGroupSlot(c,'h',1,'steam');assert.equal(c.groups[0].layout.columns[0].active,null);
 const round=configSchema.parse(JSON.parse(JSON.stringify(c)));assert.equal(round.groups.length,2);assert.equal(round.groups[1].layout.columns[1].active,'steam');
});
test('duplicate known services get unique isolated profiles; global is explicit and reversible',()=>{
 const c=defaults(),template=c.services[0],a=newInstance(template,'instance-a',c.services),b=newInstance(template,'instance-b',[...c.services,a]);
 assert.notEqual(a.profile,b.profile);assert.equal(a.globalAccess,false);assert.equal(a.running,false);assert.notEqual(a.name,b.name);
 const privateProfile=sessionProfile(a);a.globalAccess=b.globalAccess=true;assert.equal(sessionProfile(a),sessionProfile(b));a.globalAccess=false;assert.equal(sessionProfile(a),privateProfile);
 assert.equal(configSchema.parse(c).services[0].profile,template.profile);
});
test('weather accepts six-day forecasts and rejects partial or invalid data',()=>{
 const raw={current:{temperature_2m:12,weather_code:3,is_day:1},daily:{time:Array.from({length:6},(_,i)=>`2026-11-${17+i}`),weather_code:Array(6).fill(3),temperature_2m_min:Array(6).fill(4),temperature_2m_max:Array(6).fill(12),precipitation_probability_max:Array(6).fill(40)}};
 const result=parseForecast(raw);assert.equal(result.days.length,6);assert.equal(result.days[0].rain,40);assert.equal(result.temperature,12);
 assert.throws(()=>parseForecast({...raw,daily:{...raw.daily,temperature_2m_min:[]}}));
 assert.equal(commandSchema.safeParse({type:'sidebar',patch:{weatherLocation:{name:'x',latitude:100,longitude:0}}}).success,false);
});
