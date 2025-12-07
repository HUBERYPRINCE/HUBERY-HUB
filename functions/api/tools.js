export async function onRequestGet(context) {
  // 获取数据库绑定
  const { results } = await context.env.OS_DB.prepare(
    "SELECT * FROM tools ORDER BY created_at DESC"
  ).all();
  
  return Response.json(results);
}

export async function onRequestPost(context) {
  try {
    const { name, icon, code } = await context.request.json();
    
    // 插入数据
    const info = await context.env.OS_DB.prepare(
      "INSERT INTO tools (name, icon, code) VALUES (?, ?, ?)"
    ).bind(name, icon, code).run();

    return Response.json({ success: true, meta: info });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}