'use client';
import { useEffect, useState } from 'react';
type Video = { id: string; snippet: { title: string; description: string; thumbnails?: {default?:{url:string}} } };
export default function SamsonYouTubeManager() {
  const [videos, setVideos] = useState<Video[]>([]), [status, setStatus] = useState('Loading videos…'), [saving, setSaving] = useState<string | null>(null);
  useEffect(() => { fetch('/api/samson-youtube/videos').then(async r => {
    if (!r.ok) throw Error('Please sign in to manage YouTube.');
    return r.json();
  }).then(data => { setVideos(data.videos); setStatus(data.truncated ? 'Showing the first 500 videos.' : ''); }).catch(e => setStatus(e.message)); }, []);
  async function save(video: Video) {
    if (!confirm('Publish these title and description changes to YouTube?')) return;
    setSaving(video.id);
    try {
      const r = await fetch('/api/samson-youtube/videos', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ id: video.id, title: video.snippet.title, description: video.snippet.description }) });
      const result = await r.json();
      if (!r.ok) throw Error(result.error || 'Update failed');
      alert('YouTube video updated successfully.');
    } catch (e) { alert(e instanceof Error ? e.message : 'Update failed'); }
    finally { setSaving(null); }
  }
  return <main style={{maxWidth:900,margin:'40px auto',padding:24,fontFamily:'Arial,sans-serif'}}>
    <h1>Samson YouTube Manager</h1>
    <p>Private channel administration. Changes are only published when you select Save and confirm.</p>
    <p><a href="/api/samson-youtube/login">Sign in with Google / Reauthorize YouTube</a></p>
    {status && <p role="status">{status}</p>}
    {videos.map((video, i) => <section key={video.id} style={{border:'1px solid #aaa',padding:18,margin:'18px 0',borderRadius:8}}>
      <p><strong>Video {i+1}</strong> · <a href={'https://www.youtube.com/watch?v='+video.id} target="_blank" rel="noreferrer">Watch on YouTube</a></p>
      <label style={{display:'block'}}>Title<input aria-label={'Title for '+video.id} maxLength={100} value={video.snippet.title} onChange={e => setVideos(videos.map(v => v.id === video.id ? {...v,snippet:{...v.snippet,title:e.target.value}} : v))} style={{display:'block',width:'100%',padding:8,marginTop:5}} /></label>
      <label style={{display:'block',marginTop:12}}>Description<textarea aria-label={'Description for '+video.id} maxLength={5000} rows={6} value={video.snippet.description || ''} onChange={e => setVideos(videos.map(v => v.id === video.id ? {...v,snippet:{...v.snippet,description:e.target.value}} : v))} style={{display:'block',width:'100%',padding:8,marginTop:5}} /></label>
      <button disabled={saving !== null} onClick={() => save(video)} style={{marginTop:12,padding:'10px 18px',background:'#a10c16',color:'white',border:0,borderRadius:5}}>{saving===video.id?'Saving…':'Save to YouTube'}</button>
    </section>)}
  </main>;
}
