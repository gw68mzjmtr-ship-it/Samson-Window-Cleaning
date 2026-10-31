const fs=require('node:fs'),path=require('node:path'),Module=require('node:module'),ts=require('typescript');
const cache=new Map();
function load(file){file=path.resolve(file);if(cache.has(file))return cache.get(file).exports;const m=new Module(file);cache.set(file,m);m.paths=Module._nodeModulePaths(path.dirname(file));const native=m.require.bind(m);m.require=id=>{if(id.startsWith('.')){let resolved=path.resolve(path.dirname(file),id);if(fs.existsSync(resolved+'.ts'))return load(resolved+'.ts')}return native(id)};m._compile(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText,file);return m.exports}
module.exports=load;
