describe('Websocket tests', () => {
  it('should see data being sent', () => {
    browser.timeouts('implicit', 60000)

    browser.url('http://localhost:12345/')
    browser.waitForExist('#result', 60000)
    const res = browser.getValue('#result')
    expect(res).to.equal('payload')
  })
})
