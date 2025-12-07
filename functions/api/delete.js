export async function onRequestPost(context) {
  try {
    const { id } = await context.request.json();
    
    await context.env.OS_DB.prepare(
      "DELETE FROM tools WHERE id = ?"
    ).bind(id).run();

    return Response.json({ success: true });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}