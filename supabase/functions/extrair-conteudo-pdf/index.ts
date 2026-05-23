const corsHeaders = {"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type"};
const buildPrompt = (u,m) => `Você é especialista em pedagogia. Analise este material e extraia conteúdo sobre "${u}" da matéria "${m}". Retorne SOMENTE JSON válido sem markdown:\n{"titulo":"Título conciso (máx 80 chars)","conteudo":"Texto didático 300-600 palavras, linguagem ensino médio, conceitos e definições completos","exemplos":"2-3 exemplos práticos ou resolvidos","formulas":"Fórmulas, leis ou macetes. Null se não aplicável","cobertura":"resumo em 1 frase do que foi encontrado"}`;
Deno.serve(async(req)=>{
  if(req.method==="OPTIONS")return new Response("ok",{headers:corsHeaders});
  try{
    const{base64Data,mimeType="application/pdf",unidadeTitulo,materia}=await req.json();
    if(!base64Data)throw new Error("base64Data obrigatório");
    if(!unidadeTitulo)throw new Error("unidadeTitulo obrigatório");
    const KEY=Deno.env.get("OPENAI_API_KEY");
    if(!KEY)throw new Error("OPENAI_API_KEY não configurada");
    const prompt=buildPrompt(unidadeTitulo,materia||"Ensino Médio");
    const isImg=mimeType.startsWith("image/");
    let resultado;
    if(isImg){
      const r=await fetch("https://api.openai.com/v1/chat/completions",{method:"POST",headers:{"Content-Type":"application/json","Authorization":`Bearer ${KEY}`},body:JSON.stringify({model:"gpt-4o",max_tokens:4096,messages:[{role:"user",content:[{type:"image_url",image_url:{url:`data:${mimeType};base64,${base64Data}`,detail:"high"}},{type:"text",text:prompt}]}]})});
      const d=await r.json();
      if(!r.ok)throw new Error(d.error?.message||"Erro Vision");
      resultado=parse(d.choices?.[0]?.message?.content||"");
    }else{
      const bytes=Uint8Array.from(atob(base64Data),c=>c.charCodeAt(0));
      const fd=new FormData();
      fd.append("file",new Blob([bytes],{type:"application/pdf"}),"material.pdf");
      fd.append("purpose","assistants");
      const up=await fetch("https://api.openai.com/v1/files",{method:"POST",headers:{Authorization:`Bearer ${KEY}`},body:fd});
      const upd=await up.json();
      if(!up.ok)throw new Error(upd.error?.message||"Erro upload");
      const fid=upd.id;
      try{
        const or=await fetch("https://api.openai.com/v1/responses",{method:"POST",headers:{"Content-Type":"application/json",Authorization:`Bearer ${KEY}`},body:JSON.stringify({model:"gpt-4o",input:[{role:"user",content:[{type:"input_file",file_id:fid},{type:"input_text",text:prompt}]}]})});
        const od=await or.json();
        if(!or.ok)throw new Error(od.error?.message||"Erro API");
        const txt=od.output?.filter(o=>o.type==="message")?.flatMap(o=>o.content)?.filter(c=>c.type==="output_text")?.map(c=>c.text)?.join("")||"";
        resultado=parse(txt);
      }finally{fetch(`https://api.openai.com/v1/files/${fid}`,{method:"DELETE",headers:{Authorization:`Bearer ${KEY}`}}).catch(()=>{});}
    }
    return new Response(JSON.stringify({conteudo:resultado}),{headers:{...corsHeaders,"Content-Type":"application/json"}});
  }catch(err){
    return new Response(JSON.stringify({error:err.message}),{status:500,headers:{...corsHeaders,"Content-Type":"application/json"}});
  }
});
function parse(text){
  const clean=text.replace(/```json/g,"").replace(/```/g,"").trim();
  const m=clean.match(/\{[\s\S]*\}/);
  if(!m)throw new Error("JSON inválido");
  return JSON.parse(m[0]);
}
