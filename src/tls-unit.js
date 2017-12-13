/* eslint-disable no-unused-expressions */

import TLS from './tls'

describe('TlsClient unit tests', function () {
  describe('#verifyCertificate', function () {
    // Forge mocks
    const certNoAltWildcard = {
      subject: {
        getField: () => ({ value: '*.wmail.io' })
      },
      getExtension: () => false
    }

    const certAlt = {
      subject: {
        getField: () => ({ value: '*.wmail.io' })
      },
      getExtension: () => ({
        altNames: [{
          value: '*.wmail.io'
        }, {
          value: 'wmail.io'
        }]
      })
    }

    const certNoAltExact = {
      subject: {
        getField: () => ({ value: 'imap.wmail.io' })
      },
      getExtension: () => false
    }

    it('should validate certificate hostname from CN', function () {
      expect(TLS.prototype.verifyCertificate(certNoAltExact, 'imap.wmail.io')).to.be.true
    })

    it('should validate certificate hostname from wildcard CN', function () {
      expect(TLS.prototype.verifyCertificate(certNoAltWildcard, 'wild.wmail.io')).to.be.true
    })

    it('should validate certificate hostname from wildcard SAN', function () {
      expect(TLS.prototype.verifyCertificate(certAlt, 'wild.wmail.io')).to.be.true
    })

    it('should validate certificate hostname from exact SAN', function () {
      expect(TLS.prototype.verifyCertificate(certAlt, 'wmail.io')).to.be.true
    })

    it('should not validate certificate hostname from CN', function () {
      expect(TLS.prototype.verifyCertificate(certNoAltExact, 'wmail.com')).to.be.false
      expect(TLS.prototype.verifyCertificate(certNoAltExact, 'foo')).to.be.false
    })

    it('should not validate certificate hostname from wildcard CN', function () {
      expect(TLS.prototype.verifyCertificate(certNoAltWildcard, 'wmail.com')).to.be.false
      expect(TLS.prototype.verifyCertificate(certNoAltWildcard, 'foo')).to.be.false
    })

    it('should not validate certificate hostname from wildcard SAN', function () {
      expect(TLS.prototype.verifyCertificate(certAlt, 'wmail.com')).to.be.false
      expect(TLS.prototype.verifyCertificate(certAlt, 'foo')).to.be.false
    })

    it('should not validate certificate hostname from exact SAN', function () {
      expect(TLS.prototype.verifyCertificate(certAlt, 'wmail.com')).to.be.false
      expect(TLS.prototype.verifyCertificate(certAlt, 'foo')).to.be.false
    })
  })

  describe('#compareServername', function () {
    it('should find exact match', function () {
      expect(TLS.prototype.compareServername('imap.wmail.io', 'imap.wmail.io')).to.be.true
      expect(TLS.prototype.compareServername('imap.wmail.io', 'no-imap.wmail.io')).to.be.false
    })

    it('should find wildcard match', function () {
      expect(TLS.prototype.compareServername('imap.wmail.io', '*.wmail.io')).to.be.true
      expect(TLS.prototype.compareServername('imap.wmail.io', 'imap.*.io')).to.be.false
    })
  })
})
