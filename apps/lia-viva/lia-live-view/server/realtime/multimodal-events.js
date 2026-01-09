// ======================================================================
// 📦 MULTIMODAL SOCKET.IO EVENTS
// ======================================================================
// Eventos para renderização de conteúdo dinâmico

export function setupMultimodalEvents(socket) {
  // Renderizar gráfico
  socket.on('lia:render-chart', (data) => {
    console.log('📊 Renderizando gráfico:', data.containerId);
    socket.broadcast.emit('lia:chart-rendered', data);
  });

  // Renderizar tabela
  socket.on('lia:render-table', (data) => {
    console.log('📋 Renderizando tabela:', data.containerId);
    socket.broadcast.emit('lia:table-rendered', data);
  });

  // Renderizar documento
  socket.on('lia:render-document', (data) => {
    console.log('📄 Renderizando documento:', data.containerId);
    socket.broadcast.emit('lia:document-rendered', data);
  });

  // Renderizar imagem
  socket.on('lia:render-image', (data) => {
    console.log('🖼️ Renderizando imagem:', data.containerId);
    socket.broadcast.emit('lia:image-rendered', data);
  });

  // Renderizar análise
  socket.on('lia:render-analysis', (data) => {
    console.log('🔍 Renderizando análise:', data.containerId);
    socket.broadcast.emit('lia:analysis-rendered', data);
  });

  // Criar container
  socket.on('lia:container-create', (data) => {
    console.log('📦 Criando container:', data.type);
    socket.broadcast.emit('lia:container-created', data);
  });

  // Remover container
  socket.on('lia:container-remove', (data) => {
    console.log('🗑️ Removendo container:', data.containerId);
    socket.broadcast.emit('lia:container-removed', data);
  });

  // Limpar todos os containers
  socket.on('lia:containers-clear', () => {
    console.log('🧹 Limpando todos os containers');
    socket.broadcast.emit('lia:containers-cleared');
  });

  // Erro multimodal
  socket.on('lia:error', (data) => {
    console.error('❌ Erro multimodal:', data.error);
    socket.broadcast.emit('lia:error-occurred', data);
  });

  console.log('✅ Eventos multimodais configurados para socket:', socket.id);
}
