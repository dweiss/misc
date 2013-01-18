(function() {
    /**
     * @constructor
     * @augments Kinetic.Shape
     */
    Kinetic.Slice = function(config) {
        this._initSlice(config);
    };

    Kinetic.Slice.prototype = {
        _initSlice: function(config) {
            this.setDefaultAttrs({
                radius_from: 0,
                radius_to: 0,
                angle: 0,
                clickwise: true
            });

            // call super constructor
            Kinetic.Shape.call(this, config);
            this.shapeType = 'Slice';
            this._setDrawFuncs();
        },
        drawFunc: function(canvas) {
            var context = canvas.getContext();
            context.beginPath();
            var r_inner = this.getRadiusFrom();
            var r_outer = this.getRadiusTo();
            var angle_from = this.getAngleFrom();
            var angle_to   = this.getAngleTo();
            context.arc(0, 0, r_inner, angle_from,   angle_to, false);
            context.arc(0, 0, r_outer,   angle_to, angle_from,  true);
            context.closePath();
            canvas.fillStroke(this);
        },
        /**
         * set angle in degrees
         * @name setAngleDeg
         * @methodOf Kinetic.Wedge.prototype
         * @param {Number} deg
         */
        setAngleDeg: function(deg) {
            this.setAngle(Kinetic.Type._degToRad(deg));
        },
        /**
         * set angle in degrees
         * @name getAngleDeg
         * @methodOf Kinetic.Wedge.prototype
         */
        getAngleDeg: function() {
            return Kinetic.Type._radToDeg(this.getAngle());
        }
    };
    Kinetic.Global.extend(Kinetic.Slice, Kinetic.Shape);

    // add getters setters
    Kinetic.Node.addGettersSetters(Kinetic.Slice, ['radiusFrom', 'radiusTo', 'angleFrom', 'angleTo', 'clockwise']);
})();
