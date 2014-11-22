// toDataURL support

(function ()
{
    var UNSIGNED_INTEGER_MAX  = 0xffffffff;
    var BYTE_MAX              = 0x000000ff;
    var BIT_DEPTH             = 0x00000008;
    var RGBA_LENGTH           = 0x00000004;
    var FILTER                = 0x00000000;
    var BLOCK_SIZE            = 0x00008000; // 32 Kb sliding window

    /**
     * Convert signed integer to unsigned integer
     *
     * @return Number
     */

    Number.prototype.toUInt = function()
    {
        return this >>> 0;
    };


    /**
     * Convert the integer into four bytes
     *
     * @return Array<Number>
     */

    Number.prototype.bytes32    = function()
    {
        return [
            this >>> 24 & BYTE_MAX,
            this >>> 16 & BYTE_MAX,
            this >>> 8  & BYTE_MAX,
            this        & BYTE_MAX
        ];
    };


    /**
     *
     *
     * @return Array<Number>
     */

    Number.prototype.bytes16sw  = function()
    {
        return [
            this       & BYTE_MAX,
            this >>> 8 & BYTE_MAX
        ];
    };


    /**
     * 
     * @return Number
     */
    Array.prototype.adler32 = function(start, length)
    {
        // Make this more readable
        switch (arguments.length) {
            case 0:
                start   = 0;
            case 1:
                length  = this.length - start;
                break;
        }


        var a   = 1;
        var b   = 0;


        for (var i = 0; i < length; i ++) {

            a   = (a + this[start + i]) % 65521;
            b   = (b + a)               % 65521;

        }


        return ((b << 16) | a).toUInt();
    };


    /**
     *
     * @return Number
     */
    Array.prototype.crc32   = function(start, length)
    {
        // Make this more readable
        switch (arguments.length) {
            case 0:
                start   = 0;
            case 1:
                length  = this.length - start;
                break;
        }


        var table   = arguments.callee.crctable;


        if (!table) {

            var c;
                table   = [];


            for (var n = 0; n < BYTE_MAX + 1; n ++) {
                
                c   = n;


                for (var k = 0; k < BIT_DEPTH; k ++) {
                    
                    c   = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;

                }


                table[n] = c.toUInt();

            }


            arguments.callee.crctable   = table;

        }


        var c = 0xffffffff;


        for (var i = 0; i < length; i ++) {

            c = table[(c ^ this[start + i]) & 0xff] ^ (c >>> 8);

        }


        return (c^0xffffffff).toUInt();
    };


    /**
     *
     *
     * @return 
     */

    function toDataURL(type)
    {
        var context             = this.getContext("2d");
        var width               = this.width;
        var height              = this.height;

        var ImageBuffer         = context.getImageData(0, 0, width, height).data;
        var ImageBufferLength   = ImageBuffer.length;
        
        var scanLineLength      = width * RGBA_LENGTH + FILTER.length;
        var ImageData           = new Array(scanLineLength * height);
        var shift               = 0;

        var ImageStream         = [
            0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, // PNG Signature
            0x00, 0x00, 0x00, 0x0d,
            0x49, 0x48, 0x44, 0x52  // IHDR
        ];


        // Construct IHDR chunk
        ImageStream.concat(width.bytes32());  // width
        ImageStream.concat(height.bytes32()); // height
        ImageStream.push(
            BIT_DEPTH, // bit depth
            0x06,      // color type            True color with alpha
            0x00,      // compression method     
            0x00,      // filter method
            0x00       // interlace method
        );


        // Concatenate crc32 check value
        ImageStream.concat(crc32(12, 17).bytes32());


        // Reconstruct the ImageBuffer with the FILTER built in on each Scan line.
        // This could be accomplished with ImageBuffer.splice but this method is
        // slow for the amount of data there is.

        for (var i = 0; i < ImageBufferLength; i += RGBA_LENGTH) {
            
            // Check if a new line should begin
            if (i % scanLineLength - FILTER.length === 0) {
                // Insert FILTER
                ImageData[i + shift]  = FILTER;

                // Shift the RGBA data
                shift ++;
            }


            // Insert RGBA data
            ImageData[i + shift]      = ImageBuffer[i + 1];
            ImageData[i + shift + 1]  = ImageBuffer[i + 2];
            ImageData[i + shift + 2]  = ImageBuffer[i + 3];
            ImageData[i + shift + 3]  = ImageBuffer[i + 4];

        }


        ImageBuffer   = null; // Clean up unnecessary data.

        
        // Count how many blocks of 32 Kb of data there is.
        var blocks  = Math.ceil(ImageData.length / BLOCK_SIZE);






        var ImageStreamBase64   = btoa(ImageStream.map(function (c) {
            return String.fromCharCode(c);
        }).join(''));


        return "data:image/png;base64," + ImageStreamBase64;
    }


    var canvas      = document.createElement("canvas");
    var response    = canvas.toDataURL("image/png");


    if (response == "data:,") { // Does this browser not have toDataURL support?

        HTMLCanvasElement.prototype.toDataURL   = toDataURL;

    }

}());