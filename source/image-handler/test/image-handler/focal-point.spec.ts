// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { RekognitionClient } from "@aws-sdk/client-rekognition";
import { S3Client } from "@aws-sdk/client-s3";
import sharp from "sharp";

import { ImageHandler } from "../../image-handler";
import { ImageEdits, ImageFitTypes } from "../../lib";

const s3Client = new S3Client();
const rekognitionClient = new RekognitionClient();

describe("focalPoint", () => {
  it("Should calculate height from width and aspectRatio if height is missing", async () => {
    // Arrange
    const originalImage = Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAYAAABytg0kAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
      "base64" // 2x2 image
    );
    const image = sharp(originalImage, { failOnError: false }).withMetadata();
    const edits: ImageEdits = { 
      resize: { width: 100 },
      aspectRatio: "16:9"
    };

    // Act
    const imageHandler = new ImageHandler(s3Client, rekognitionClient);
    await imageHandler.applyEdits(image, edits, false);

    // Assert
    expect(edits.resize.height).toBe(Math.round(100 / (16/9)));
  });

  it("Should apply focal point cropping when focalX and focalY are provided", async () => {
    // Arrange
    // Create a 10x10 white image
    const originalImage = await sharp({
      create: {
        width: 10,
        height: 10,
        channels: 3,
        background: { r: 255, g: 255, b: 255 }
      }
    }).png().toBuffer();
    
    const image = sharp(originalImage, { failOnError: false }).withMetadata();
    const edits: ImageEdits = { 
      resize: { width: 5, height: 5 },
      focalX: 0,
      focalY: 0
    };

    // Act
    const imageHandler = new ImageHandler(s3Client, rekognitionClient);
    const extractSpy = jest.spyOn(sharp.prototype, 'extract');
    await imageHandler.applyEdits(image, edits, false);

    // Assert
    // For 10x10 image, target 5x5 (AR 1:1), focal 0,0
    // Orig AR 1:1, Target AR 1:1. 
    // In our logic: if origAR > targetAR (1 > 1 is false). Else case:
    // cropW = 10, cropH = 10 / 1 = 10.
    // top = 10 * 0 - 10/2 = -5. clamped to 0.
    // top = Math.max(0, Math.min(10-10, -5)) = 0.
    // left = 0.
    expect(extractSpy).toHaveBeenCalledWith({ left: 0, top: 0, width: 10, height: 10 });
    expect(edits.resize.fit).toBe(ImageFitTypes.COVER);
    
    extractSpy.mockRestore();
  });

  it("Should correctly handle wider original image and center focal point", async () => {
    // Arrange
    // 20x10 image (AR 2:1)
    const originalImage = await sharp({
      create: {
        width: 20,
        height: 10,
        channels: 3,
        background: { r: 255, g: 255, b: 255 }
      }
    }).png().toBuffer();
    
    const image = sharp(originalImage, { failOnError: false }).withMetadata();
    const edits: ImageEdits = { 
      resize: { width: 10, height: 10 }, // Target AR 1:1
      focalX: 0.5,
      focalY: 0.5
    };

    // Act
    const imageHandler = new ImageHandler(s3Client, rekognitionClient);
    const extractSpy = jest.spyOn(sharp.prototype, 'extract');
    await imageHandler.applyEdits(image, edits, false);

    // Assert
    // origAR = 2, targetAR = 1. origAR > targetAR is true.
    // cropH = 10, cropW = 10 * 1 = 10.
    // left = 20 * 0.5 - 10/2 = 10 - 5 = 5.
    // top = 0.
    expect(extractSpy).toHaveBeenCalledWith({ left: 5, top: 0, width: 10, height: 10 });
    
    extractSpy.mockRestore();
  });

  it("Should not apply focal point cropping if focalX or focalY is null", async () => {
    // Arrange
    const originalImage = await sharp({
      create: {
        width: 10,
        height: 10,
        channels: 3,
        background: { r: 255, g: 255, b: 255 }
      }
    }).png().toBuffer();
    
    const image = sharp(originalImage, { failOnError: false }).withMetadata();
    const edits: ImageEdits = { 
      resize: { width: 5, height: 5 },
      focalX: null,
      focalY: 0.5
    };

    // Act
    const imageHandler = new ImageHandler(s3Client, rekognitionClient);
    const extractSpy = jest.spyOn(sharp.prototype, 'extract');
    await imageHandler.applyEdits(image, edits, false);

    // Assert
    expect(extractSpy).not.toHaveBeenCalled();
    
    extractSpy.mockRestore();
  });
});

