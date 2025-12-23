# Focal Point Cropping & Aspect Ratio

This document explains how to use the focal point cropping and aspect ratio features in the AWS Custom Image Transformation solution.

## Overview

The focal point cropping feature allows you to specify a point of interest in an image and ensures that this point remains as the center of the crop when the image is resized to a different aspect ratio. This is particularly useful for portrait/landscape conversions or when using Next.js `next/image` which often only provides a fixed width.

## New Query Parameters

The following query parameters have been added:

| Parameter | Type | Description |
| :--- | :--- | :--- |
| `focalX` | `float` | The horizontal coordinate of the focal point (0.0 to 1.0). `0.5` is the center. |
| `focalY` | `float` | The vertical coordinate of the focal point (0.0 to 1.0). `0.5` is the center. |
| `aspectRatio` | `string` | The desired aspect ratio for the output image. Can be in `W:H` format (e.g., `16:9`) or a decimal (e.g., `1.77`). |

## How it Works

### 1. Automatic Height Calculation
If you provide a `width` and an `aspectRatio`, but omit the `height`, the image handler will automatically calculate the target height to match the requested aspect ratio.

**Example:**
`?width=800&aspectRatio=1:1` -> Resulting image will be 800x800.

### 2. Focal Point Centered Cropping
When both `focalX` and `focalY` are provided along with target dimensions (via `width`, `height`, or `aspectRatio`), the handler:
1. Calculates the optimal crop area that matches the target aspect ratio.
2. Centers this crop area on your specified focal point.
3. Clamps the crop area to ensure it stays within the original image boundaries.
4. Resizes the resulting crop to your target dimensions.

## Examples

### Next.js Integration
Next.js often passes a fixed `width` to the image loader. You can use `aspectRatio` to ensure the image is cropped correctly for your UI components.

```javascript
// Example Next.js Image Loader
const myLoader = ({ src, width, quality }) => {
  return `${IMAGE_HANDLER_URL}/${src}?width=${width}&aspectRatio=16:9&focalX=0.2&focalY=0.8`;
}
```

### Focusing on a specific subject
If you have an image with a subject in the top-left corner, you can set the focal point to ensure they aren't cropped out.

**Request:**
`https://your-distribution.cloudfront.net/image.jpg?width=500&height=500&focalX=0.2&focalY=0.2`

## Implementation Details

The focal point logic is implemented in the `applyResize` method within `image-handler.ts`. It uses Sharp's `.extract()` operation before the final `.resize()` to ensure the cropping is done at the original resolution for maximum quality.

