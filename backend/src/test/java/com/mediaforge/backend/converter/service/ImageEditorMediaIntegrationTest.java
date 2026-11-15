package com.mediaforge.backend.converter.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.mediaforge.backend.converter.model.ConversionOptions;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfSystemProperty;
import org.junit.jupiter.api.io.TempDir;
import javax.imageio.ImageIO;
import java.awt.image.BufferedImage;
import java.nio.file.Path;
import java.util.UUID;
import static org.assertj.core.api.Assertions.*;

@EnabledIfSystemProperty(named = "mediaforge.media-integration", matches = "true")
class ImageEditorMediaIntegrationTest {
    @TempDir Path dir;
    @Test void cropRotationAndFiveFilterStylesChangeRealExportedPixels() throws Exception {
        var original = new BufferedImage(320, 240, BufferedImage.TYPE_INT_RGB);
        for (int y=0; y<240; y++) for (int x=0; x<320; x++) original.setRGB(x,y, ((x*255/320)<<16)|((y*255/240)<<8)|80);
        var input = dir.resolve("source.png").toFile(); ImageIO.write(original,"png",input);
        var service = new ImageConversionServiceImpl(new FFmpegProcessExecutor(), new MediaProbeServiceImpl(new ObjectMapper()));
        double[][] styles = {{.03,1.12,1.45,0},{.03,1.1,1.3,.3},{.02,1.1,1.3,-.3},{-.04,1.4,.8,0},{0,1.15,0,0}};
        for (int i=0; i<styles.length; i++) {
            var options = new ConversionOptions();
            options.setCropX(40); options.setCropY(30); options.setCropWidth(200); options.setCropHeight(100);
            options.setImageRotation(90);
            options.setBrightness(styles[i][0]); options.setContrast(styles[i][1]);
            options.setSaturation(styles[i][2]); options.setWarmth(styles[i][3]);
            var output=dir.resolve("filter-"+i+".png").toFile();
            assertThat(service.convertImage(UUID.randomUUID(),input,output,"png",options,null).isSuccess()).isTrue();
            var image=ImageIO.read(output);
            assertThat(image.getWidth()).isEqualTo(100); assertThat(image.getHeight()).isEqualTo(200);
            assertThat(image.getRGB(50,100)).isNotEqualTo(original.getRGB(140,80));
            if(i==4) {
                int pixel=image.getRGB(50,100);
                assertThat(Math.abs(((pixel>>16)&255)-((pixel>>8)&255))).isLessThan(4);
            }
        }
    }
}
