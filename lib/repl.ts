
export const loadConnector = async (connectorPath: string) => {
  let c = require(connectorPath)
  const connector = c.connector
  const connectorCustomizer = c.connectorCustomizer
  Object.keys(require.cache)
    .filter((key: string) => !key.includes('node_modules'))
    .forEach((key: string) => delete require.cache[key])

  return {
    connector: typeof connector === 'function' ? await connector() : connector,
    connectorCustomizer: typeof connectorCustomizer === 'function' ? await connectorCustomizer() : connectorCustomizer
  }
}
