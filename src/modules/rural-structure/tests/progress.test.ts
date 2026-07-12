import{describe,expect,it}from"vitest";import{structureChecklist}from"../domain/progress";
describe("structureChecklist",()=>{it("reveals progressive completion",()=>{const items=structureChecklist({plots:1,plantings:1,seasons:0,links:0});expect(items.map(i=>i.done)).toEqual([true,true,true,false,false])})});
