'use strict';

var expect = require('chai').expect,
    TlsClient = require('../../src/tcp-socket-tls').TLS;

describe('TlsClient unit tests', function() {

    describe('#verifyCertificate', function() {
        var certNoAltExact, certNoAltWildcard, certAlt;

        beforeEach(function() {
            certNoAltExact = {
                subject: {
                    getField: function() {
                        return {
                            value: 'imap.wmail.io'
                        };
                    }
                },
                getExtension: function() {
                    return false;
                }
            };

            certNoAltWildcard = {
                subject: {
                    getField: function() {
                        return {
                            value: '*.wmail.io'
                        };
                    }
                },
                getExtension: function() {
                    return false;
                }
            };

            certAlt = {
                subject: {
                    getField: function() {
                        return {
                            value: '*.wmail.io'
                        };
                    }
                },
                getExtension: function() {
                    return {
                        altNames: [{
                            value: '*.wmail.io'
                        }, {
                            value: 'wmail.io'
                        }]
                    };
                }
            };
        });

        it('should validate certificate hostname from CN', function() {
            expect(TlsClient.prototype.verifyCertificate(certNoAltExact, 'imap.wmail.io')).to.be.true;
        });

        it('should validate certificate hostname from wildcard CN', function() {
            expect(TlsClient.prototype.verifyCertificate(certNoAltWildcard, 'wild.wmail.io')).to.be.true;
        });

        it('should validate certificate hostname from wildcard SAN', function() {
            expect(TlsClient.prototype.verifyCertificate(certAlt, 'wild.wmail.io')).to.be.true;
        });

        it('should validate certificate hostname from exact SAN', function() {
            expect(TlsClient.prototype.verifyCertificate(certAlt, 'wmail.io')).to.be.true;
        });

        it('should not validate certificate hostname from CN', function() {
            expect(TlsClient.prototype.verifyCertificate(certNoAltExact, 'wmail.com')).to.be.false;
            expect(TlsClient.prototype.verifyCertificate(certNoAltExact, 'foo')).to.be.false;
        });

        it('should not validate certificate hostname from wildcard CN', function() {
            expect(TlsClient.prototype.verifyCertificate(certNoAltWildcard, 'wmail.com')).to.be.false;
            expect(TlsClient.prototype.verifyCertificate(certNoAltWildcard, 'foo')).to.be.false;
        });

        it('should not validate certificate hostname from wildcard SAN', function() {
            expect(TlsClient.prototype.verifyCertificate(certAlt, 'wmail.com')).to.be.false;
            expect(TlsClient.prototype.verifyCertificate(certAlt, 'foo')).to.be.false;
        });

        it('should not validate certificate hostname from exact SAN', function() {
            expect(TlsClient.prototype.verifyCertificate(certAlt, 'wmail.com')).to.be.false;
            expect(TlsClient.prototype.verifyCertificate(certAlt, 'foo')).to.be.false;
        });
    });

    describe('#compareServername', function() {
        it('should find exact match', function() {
            expect(TlsClient.prototype.compareServername('imap.wmail.io', 'imap.wmail.io')).to.be.true;
            expect(TlsClient.prototype.compareServername('imap.wmail.io', 'no-imap.wmail.io')).to.be.false;
        });

        it('should find wildcard match', function() {
            expect(TlsClient.prototype.compareServername('imap.wmail.io', '*.wmail.io')).to.be.true;
            expect(TlsClient.prototype.compareServername('imap.wmail.io', 'imap.*.io')).to.be.false;
        });
    });
});