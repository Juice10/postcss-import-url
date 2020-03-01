var postcss = require('postcss');
var expect = require('chai').expect;
var fs = require('fs');
var plugin = require('../');
var tcpp = require('tcp-ping');

var fixture1Css = fs.readFileSync(__dirname + '/fixture-1/style.css', { encoding: 'utf8' });

var testEqual = function(input, output, opts, postcssOptions, done) {
    postcss([plugin(opts)])
        .process(input, postcssOptions)
        .then(function(result) {
            expect(result.css.trim()).to.eql(output.trim());
            expect(result.warnings()).to.be.empty;
            done();
        })
        .catch(function(error) {
            done(error);
        });
};

var testContains = function(input, value, opts, postcssOptions, done) {
    postcss([plugin(opts)])
        .process(input, postcssOptions)
        .then(function(result) {
            expect(result.css).to.contain(value);
            expect(result.warnings()).to.be.empty;
            done(null, result);
        })
        .catch(function(error) {
            done(error);
        });
};

describe('import with media queries', function() {
    it('only screen', function(done) {
        var input =
            "@import 'http://fonts.googleapis.com/css?family=Tangerine' only screen and (color)";
        testContains(input, '@media only screen and (color)', {}, {}, done);
    });

    it('rule with and', function(done) {
        var input =
            "@import 'http://fonts.googleapis.com/css?family=Tangerine' screen and (orientation:landscape)";
        testContains(input, '@media screen and (orientation:landscape)', {}, {}, done);
    });

    it('rule projection, tv', function(done) {
        var input =
            "@import url('http://fonts.googleapis.com/css?family=Tangerine') projection, tv";
        testContains(input, '@media projection, tv', {}, {}, done);
    });

    it('rule print', function(done) {
        var input = "@import url('http://fonts.googleapis.com/css?family=Tangerine') print";
        testContains(input, '@media print', {}, {}, done);
    });

    it('contains it', function(done) {
        var input =
            "@import url('http://fonts.googleapis.com/css?family=Tangerine') (min-width: 25em);";
        testContains(input, '(min-width: 25em)', {}, {}, done);
    });

    describe('media query', function() {
        it('contains font-family', function(done) {
            var input =
                "@import url('http://fonts.googleapis.com/css?family=Tangerine') (min-width: 25em);";
            testContains(input, "font-family: 'Tangerine'", {}, {}, done);
        });

        it('contains src local', function(done) {
            var input =
                "@import url('http://fonts.googleapis.com/css?family=Tangerine') (min-width: 25em);";
            testContains(input, "src: local('Tangerine Regular')", {}, {}, done);
        });
    });
});

describe('skip non remote files', function() {
    it('local', function(done) {
        testEqual("@import 'a.css';", "@import 'a.css';", {}, {}, done);
    });

    it('relative parent', function(done) {
        var input = "@import '../a.css'";
        testEqual(input, input, {}, {}, done);
    });

    it('relative child', function(done) {
        var input = "@import './a/b.css'";
        testEqual(input, input, {}, {}, done);
    });

    // it("no protocol", function(done) {
    // 	var input = "@import url(//example.com/a.css)";
    // 	test(input, input, {}, done);
    // });
});

describe('import url tangerine', function() {
    function assertOutputTangerine(result) {
        expect(result.css).to.contain("font-family: 'Tangerine'");
        expect(result.css).to.contain('font-style: normal');
        expect(result.css).to.contain('font-weight: 400');
        expect(result.css).to.contain(
            "src: local('Tangerine Regular'), local('Tangerine-Regular'), url(http://fonts.gstatic.com/s/tangerine",
        );
    }

    it('empty', function(done) {
        var input = "@import 'http://fonts.googleapis.com/css?family=Tangerine'            ;";
        testContains(input, 'Tangerine', {}, {}, function(err, result) {
            result && assertOutputTangerine(result);
            done(err);
        });
    });

    it('double quotes', function(done) {
        var input = '@import "http://fonts.googleapis.com/css?family=Tangerine";';
        testContains(input, 'Tangerine', {}, {}, function(err, result) {
            result && assertOutputTangerine(result);
            done(err);
        });
    });

    it('single quotes', function(done) {
        var input = "@import 'http://fonts.googleapis.com/css?family=Tangerine';";
        testContains(input, 'Tangerine', {}, {}, function(err, result) {
            result && assertOutputTangerine(result);
            done(err);
        });
    });

    it('url single quotes', function(done) {
        var input = "@import url('http://fonts.googleapis.com/css?family=Tangerine');";
        testContains(input, 'Tangerine', {}, {}, function(err, result) {
            result && assertOutputTangerine(result);
            done(err);
        });
    });

    it('url double quotes', function(done) {
        var input = '@import url("http://fonts.googleapis.com/css?family=Tangerine");';
        testContains(input, 'Tangerine', {}, {}, function(err, result) {
            result && assertOutputTangerine(result);
            done(err);
        });
    });

    it('url no quotes', function(done) {
        var input = '@import url(http://fonts.googleapis.com/css?family=Tangerine);';
        testContains(input, 'Tangerine', {}, {}, function(err, result) {
            result && assertOutputTangerine(result);
            done(err);
        });
    });
});

describe('recursive import', function() {
    it('ping server', done => {
        tcpp.probe('localhost', 1234, function(err) {
            done(err);
        });
    });

    var opts = {
        recursive: true,
    };

    describe('fixture-1', function() {
        it('fixture-1 contains class a1', function(done) {
            var input = '@import url(http://localhost:1234/fixture-1/style.css)';
            testContains(input, 'content: ".a1"', opts, {}, done);
        });

        it('fixture-1 contains class a', function(done) {
            var input = '@import url(http://localhost:1234/fixture-1/style.css)';
            testContains(input, 'content: ".a"', opts, {}, done);
        });

        it('fixture-1 contains class style content', function(done) {
            var input = '@import url(http://localhost:1234/fixture-1/style.css)';
            testContains(input, 'content: ".style"', opts, {}, done);
        });

        it('fixture-1 contains class a when passed as a string', function(done) {
            var input = fixture1Css;
            testContains(
                input,
                'content: ".a"',
                opts,
                {
                    from: 'http://localhost:1234/fixture-1/style.css',
                },
                done,
            );
        });
    });

    describe('fixture-2', function() {
        it('fixture-2 contains class a1', function(done) {
            var input = '@import url(http://localhost:1234/fixture-2/style.css)';
            testContains(input, 'content: ".a1"', opts, {}, done);
        });

        it('fixture-2 contains class a', function(done) {
            var input = '@import url(http://localhost:1234/fixture-2/style.css)';
            testContains(input, 'content: ".a"', opts, {}, done);
        });

        it('fixture-2 contains class b1', function(done) {
            var input = '@import url(http://localhost:1234/fixture-2/style.css)';
            testContains(input, 'content: ".b1"', opts, {}, done);
        });

        it('fixture-2 contains class b', function(done) {
            var input = '@import url(http://localhost:1234/fixture-2/style.css)';
            testContains(input, 'content: ".b"', opts, {}, done);
        });

        it('fixture-2 contains class style content', function(done) {
            var input = '@import url(http://localhost:1234/fixture-2/style.css)';
            testContains(input, 'content: ".style"', opts, {}, done);
        });
    });

    describe('fixture-3 convert relative paths in property values', function() {
        it('does not resolve relative URLs by default', function(done) {
            var input = '@import url(http://localhost:1234/fixture-3/style.css)';
            testContains(input, 'src: url("./font.woff");', {}, {}, done);
        });

        it('does not resolve relative URLs when option.resolveURLs is false', function(done) {
            var input = '@import url(http://localhost:1234/fixture-3/style.css)';
            testContains(input, 'src: url("./font.woff");', { resolveUrls: false }, {}, done);
        });

        var _opts = { resolveUrls: true };

        it('resolves relative URLs when option.resolveURLs is true', function(done) {
            var input = '@import url(http://localhost:1234/fixture-3/style.css)';
            testContains(
                input,
                'src: url("http://localhost:1234/fixture-3/font.woff");',
                _opts,
                {},
                done,
            );
        });

        it('does not modify absolute paths', function(done) {
            var input = '@import url(http://localhost:1234/fixture-3/style.css)';
            testContains(
                input,
                'background-image: url("http://example.com/absolute.png");',
                _opts,
                {},
                done,
            );
        });

        it('makes root relative paths absolute', function(done) {
            var input = '@import url(http://localhost:1234/fixture-3/style.css)';
            testContains(
                input,
                'background-image: url("http://localhost:1234/root-relative.png")',
                _opts,
                {},
                done,
            );
        });

        it('makes implicit sibling paths absolute', function(done) {
            var input = '@import url(http://localhost:1234/fixture-3/style.css)';
            testContains(
                input,
                'background-image: url("http://localhost:1234/fixture-3/implicit-sibling.png")',
                _opts,
                {},
                done,
            );
        });

        it('makes relative sibling paths absolute', function(done) {
            var input = '@import url(http://localhost:1234/fixture-3/style.css)';
            testContains(
                input,
                'background-image: url("http://localhost:1234/fixture-3/sibling.png")',
                _opts,
                {},
                done,
            );
        });

        it('makes parent relative paths absolute', function(done) {
            var input = '@import url(http://localhost:1234/fixture-3/style.css)';
            testContains(
                input,
                'background-image: url("http://localhost:1234/parent.png")',
                _opts,
                {},
                done,
            );
        });

        it('makes grandparent relative paths absolute', function(done) {
            var input = '@import url(http://localhost:1234/fixture-3/style.css)';
            testContains(
                input,
                'background-image: url("http://localhost:1234/grandparent.png")',
                _opts,
                {},
                done,
            );
        });

        var _optsRecursive = { resolveUrls: true, recursive: true };

        // Test paths are resolved for recursively imported stylesheets
        it('makes relative sibling paths absolute - recursive', function(done) {
            var input = '@import url(http://localhost:1234/fixture-3/style.css)';
            testContains(
                input,
                'background-image: url("http://localhost:1234/fixture-3/recursive/sibling-recursive.png")',
                _optsRecursive,
                {},
                done,
            );
        });

        it('makes parent relative paths absolute - recursive', function(done) {
            var input = '@import url(http://localhost:1234/fixture-3/style.css)';
            testContains(
                input,
                'background-image: url("http://localhost:1234/fixture-3/parent-recursive.png")',
                _optsRecursive,
                {},
                done,
            );
        });

        it('makes grandparent relative paths absolute - recursive', function(done) {
            var input = '@import url(http://localhost:1234/fixture-3/style.css)';
            testContains(
                input,
                'background-image: url("http://localhost:1234/grandparent-recursive.png")',
                _optsRecursive,
                {},
                done,
            );
        });
    });
});

describe('google font woff', function() {
    it('option modernBrowser should import woff', function(done) {
        var input = '@import url(http://fonts.googleapis.com/css?family=Tangerine);';
        testContains(input, "woff2) format('woff2')", { modernBrowser: true }, {}, done);
    });

    it('option agent should import woff', function(done) {
        var input = '@import url(http://fonts.googleapis.com/css?family=Tangerine);';
        var opts = {
            userAgent: 'Mozilla/5.0 AppleWebKit/537.36 Chrome/54.0.2840.99 Safari/537.36',
        };
        testContains(input, "woff2) format('woff2')", opts, {}, done);
    });
});
