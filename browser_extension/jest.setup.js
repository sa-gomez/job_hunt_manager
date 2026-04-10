global.chrome = {
  runtime: {
    sendMessage: () => {},
    onMessage: { addListener: () => {} },
  },
}
global.fetch = async () => ({ ok: false })
