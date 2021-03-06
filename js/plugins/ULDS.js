//=============================================================================
// ULDS.js
//=============================================================================

/*:
 * @plugindesc Unlimited Layer Display System.
 * @author taroxd
 *
 * @param Default Path
 * @desc The default path where pictures are stored.
 * @default parallaxes
 *
 * @param Default Z
 * @desc The default Z coordinate for sprites.
 * @type number
 * @decimals 2
 * @min -15
 * @max 15
 * @default 0.5
 *
 * @help This plugin does not provide plugin commands.
 *
 * Map Note: <ulds> JSON </ulds>
 * "name": picture filename
 * "path": picture path (default to Default Path)
 * "loop": true/false
 *    Whether the picture should loop.
 * "hue"/"smooth": the attribute of a Bitmap.
 * <attribute>: the attribute of a Sprite.
 *
 * A string can be used as a value to be interpreted as a formula.
 * In the formula, 't' refers to frame count.
 *                 's' refers to $gameSwitches.
 *                 'v' refers to $gameVaribles.
 *
 * Also, various helpers are available, defined in Helper.
 *
 * If a string is used as a formula of the attribute,
 * the attribute will be updated every frame.
 *
 * By the way, attributes such as "anchor.x" is also available.
 *
 *
 * Here is an example:
 *
   <ulds> {
     "name": "BlueSky",
     "x": "this.rx(t)",
     "y": 50,
     "loop": true
   } </ulds>
 *
 */


void function () {

    var assign = Object.assign || function (target) {
        for (var i = 1; i < arguments.length; i++) {
            var source = arguments[i];
            for (var key in source) {
                target[key] = source[key];
            }
        }
        return target;
    };

    var RE = /<ulds>([^]*?)<\/ulds>/ig;
    var parameters = PluginManager.parameters('ULDS');
    var DEFAULT_SETTINGS = {
        z: parseFloat(parameters['Default Z']),
        path: parameters['Default Path'],
        smooth: true
    };

    // Feel free to add your own helper.
    var Helper = {
        t: 0,

        // Converts a coordinate on the map to the corresponding coordinate on the screen.
        rx: function (x, scrollRate) {
            if (scrollRate == null) {
                scrollRate = $gameMap.tileWidth();
            }

            if (scrollRate === 0) {
                return x;
            } else {
                return $gameMap.adjustX(x / scrollRate) * scrollRate;
            }
        },

        ry: function (y, scrollRate) {
            if (scrollRate == null) {
                scrollRate = $gameMap.tileHeight();
            }

            if (scrollRate === 0) {
                return y;
            } else {
                return $gameMap.adjustY(y / scrollRate) * scrollRate;
            }
        },

        update: function () {
            ++this.t;
            this._updater(this.t, $gameSwitches, $gameVariables);
        },

        assignSettings: function (settings) {
            var code = '';
            for (var key in settings) {
                var value = settings[key];
                if (typeof (value) === 'string') {
                    // this.x = (formula);
                    // this.scale.x = (formula); // key is "scale.x"
                    code += 'this.' + key + ' = (' + value + ');\n';
                } else {
                    // if key is "scale.x"
                    // keys is ["scale", "x"]
                    var keys = key.split('.');
                    // set key to "x"
                    key = keys.pop();

                    var target = this;
                    keys.forEach(function (k) {
                        if (typeof (target) !== 'object') {
                            target[k] = {};
                        }
                        target = target[k];
                    });

                    target[key] = value;
                }
            }
            // You may log the code for debugging purpose.
            // console.log(code);
            this._updater = new Function('t', 's', 'v', code);
        }
    };

    // NOT a class constructor
    function ULDS(settings) {
        settings = assign({}, DEFAULT_SETTINGS, settings);
        var spriteClass = settings.loop ? ULDS.TilingSprite : ULDS.Sprite;
        var bitmap = ImageManager.loadBitmap('img/' + settings.path + '/',
            settings.name, settings.hue, settings.smooth);
        var sprite = new spriteClass(bitmap);

        delete settings.path;
        delete settings.name;
        delete settings.loop;
        delete settings.hue;
        delete settings.smooth;

        sprite.assignSettings(settings);

        return sprite;
    }

    ULDS.Sprite = function (bitmap) {
        Sprite.call(this, bitmap);
    };

    ULDS.Sprite.prototype = Object.create(Sprite.prototype);
    ULDS.Sprite.prototype.constructor = ULDS.Sprite;
    assign(ULDS.Sprite.prototype, Helper);

    ULDS.TilingSprite = function (bitmap) {
        TilingSprite.call(this, bitmap);
        bitmap.addLoadListener(function () {
            this.move(0, 0, bitmap.width, bitmap.height);
        }.bind(this));
    };

    ULDS.TilingSprite.prototype = Object.create(TilingSprite.prototype);
    ULDS.TilingSprite.prototype.constructor = ULDS.TilingSprite;
    assign(ULDS.TilingSprite.prototype, Helper);

    Object.defineProperties(ULDS.TilingSprite.prototype, {
        x: {
            get: function () { return -this.origin.x; },
            set: function (x) { this.origin.x = -x; }
        },
        y: {
            get: function () { return -this.origin.y; },
            set: function (y) { this.origin.y = -y; }
        }
    });

    var ct = Spriteset_Map.prototype.createTilemap;
    Spriteset_Map.prototype.createTilemap = function () {
        ct.call(this);
        $dataMap.note.replace(RE, function (_match, settings) {
            var isValid = false;
            try {
                settings = JSON.parse(settings);
                isValid = typeof (settings) === 'object';
                if (!isValid) {
                    throw 'ULDS settings should be an object';
                }
            } catch (e) {
                console.error(e);
                console.log(settings);
            }
            if (isValid) {
                this._tilemap.addChild(ULDS(settings));
            }
        }.bind(this));
    };
}();