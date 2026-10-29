// Hosted fictional test only; credentials come from Render's private environment.
const fs=require('node:fs'),path=require('node:path'),postgres=require('postgres'),{spawn}=require('node:child_process');
(async()=>{
 if(process.env.SAMSON_HOSTED_TEST!=='1'||!/^[-A-Za-z0-9_]{43,128}$/.test(process.env.SAMSON_TEST_ACCESS_KEY||''))throw Error('Private hosted test access is not configured');
 process.env.SAMSON_TEST_ORIGIN=process.env.SAMSON_TEST_ORIGIN||(process.env.RENDER==='true'?process.env.RENDER_EXTERNAL_URL:'');
 const origin=new URL(process.env.SAMSON_TEST_ORIGIN||'');
 if(origin.protocol!=='https:'||origin.username||origin.password||origin.pathname!=='/'||origin.search||origin.hash)throw Error('Exact HTTPS test origin required');
 const url=new URL(process.env.SAMSON_BOOKING_DATABASE_URL||'');
 if(!['postgres:','postgresql:'].includes(url.protocol)||!url.username||!url.password||!url.pathname.slice(1)||/localhost|127\.0\.0\.1|pooler|pgbouncer/i.test(url.hostname)||url.port==='6543')throw Error('A dedicated direct database connection is required');
 url.search='';const sql=postgres(url.toString(),{ssl:{rejectUnauthorized:true},max:1,prepare:false,connect_timeout:10,onnotice:()=>{}});
 try{for(const name of ['001-booking-checkout.sql','002-private-square-test.sql','003-live-checkout.sql'])await sql.unsafe(fs.readFileSync(path.join(__dirname,'..','database',name),'utf8'))}finally{await sql.end({timeout:5})}
 const port=process.env.PORT||'10000';if(!/^\d+$/.test(port))throw Error('Invalid port');
 const child=spawn(process.execPath,[require.resolve('next/dist/bin/next'),'start','-H','0.0.0.0','-p',port],{stdio:'inherit',env:process.env});
 for(const signal of ['SIGTERM','SIGINT'])process.on(signal,()=>child.kill(signal));
 child.on('error',()=>{console.error('Private website process could not start');process.exitCode=1});
 child.on('exit',code=>{process.exitCode=code??1});
})().catch(()=>{console.error('Private hosted test configuration or database setup failed. No checkout was enabled.');process.exitCode=1});
