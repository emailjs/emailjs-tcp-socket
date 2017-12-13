describe('Websocket tests', () => {
  it('should see plaintext data being sent and received', () => {
    browser.timeouts('implicit', 60000)
    browser.url('http://localhost:12345/')
    browser.waitForExist('#plaintext', 50000)
    expect(browser.getValue('#plaintext')).to.equal('payload')
  })
  it('should see TLS data being sent and received', () => {
    browser.timeouts('implicit', 60000)
    browser.url('http://localhost:12345/')
    browser.waitForExist('#tls', 50000)
    expect(browser.getValue('#tls')).to.equal('payload')
  })
})
