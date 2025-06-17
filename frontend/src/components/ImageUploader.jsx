import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import PropTypes from 'prop-types';

const VITE_API_URL = import.meta.env.VITE_API_URL;

const ImageUploader = ({ productId, formData, productImages, onImagesUpdate }) => {
  const [selectedFile, setSelectedFile] = useState(null);
  const [tempDummyImage, setTempDummyImage] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [generationError, setGenerationError] = useState(null);
  const [uploadError, setUploadError] = useState(null);

  // Store batch of fetched images for current category
  const [imageBatch, setImageBatch] = useState([]);
  // Store current category for comparison
  const lastCategoryRef = useRef('');

  const isEditMode = Boolean(productId);
  const canAddImage = isEditMode ? true : productImages.length === 0;
  const canShowAddButton = !!tempDummyImage && !productImages.length;

  // Map category & accessory_type to search term strings
  const searchTerms = {
    wine: "wine bottle",
    spirits: {
      whiskey: "whiskey bottle",
      vodka: "vodka bottle",
      gin: "gin bottle",
      rhum: "rhum bottle",
      tequila: "tequila bottle",
      brandy: "brandy bottle"
    },
    beer: "beer bottle",
    accessories: "drink accessories"
  };


  const accessoryTerms = {
  wine: {
    glassware: "wine glasses",
    decanter: "wine decanter",
    opener: "cork screw",
    gift_set: "wine gift set"
  },
  spirits: {
    glassware: "whiskey glasses",
    decanter: "whiskey decanter",
    opener: "bottle stopper",
    gift_set: "whiskey gift set"
  },
  beer: {
    glassware: "beer mugs",
    decanter: "beer growler",
    opener: "beer opener",
    gift_set: "beer gift set"
  }
};

  // Helper to get current search query based on formData
  const getSearchQuery = () => {
    if (!formData.category) return null;

    if (formData.category === 'spirits') {
      const spiritType = formData.spirit_type?.toLowerCase();
      if (spiritType && searchTerms.spirits[spiritType]) {
        return searchTerms.spirits[spiritType];
      }
      return "whiskey bottle"; // fallback pentru spirits dacă nu avem spirit_type valid
    }

    if (formData.category === 'accessories') {
      const drinkType = formData.compatible_with_product_type?.toLowerCase();
      const accessoryType = formData.accessory_type?.toLowerCase();

      if (
        drinkType &&
        accessoryType &&
        drinkType !== 'all' &&
        accessoryTerms[drinkType] &&
        accessoryTerms[drinkType][accessoryType]
      ) {
        return accessoryTerms[drinkType][accessoryType];
      }
      return "drink accessories";
    }

    return searchTerms[formData.category] || "wine bottle";
  };

  // Reset batch on category change
  useEffect(() => {
    const currentQuery = getSearchQuery();

    if (currentQuery !== lastCategoryRef.current) {
      lastCategoryRef.current = currentQuery;
      setImageBatch([]);
      setTempDummyImage(null);
      setGenerationError(null);
    }
  }, [formData]);

  const fetchNewBatch = async (query) => {
    const perPage = 50;
    const maxPages = 50;
    const randomPage = Math.floor(Math.random() * maxPages) + 1;

    const response = await axios.get(
      `${VITE_API_URL}/products/images/search?query=${encodeURIComponent(query)}&per_page=${perPage}&page=${randomPage}`
    );

    if (!response.data || response.data.length === 0) {
      throw new Error('No images found for the given query.');
    }

    return response.data; // Array of images
  };

  const generateDummyImage = async () => {
    try {
      setIsGenerating(true);
      setGenerationError(null);

      const query = getSearchQuery();
      console.log('Current search query:', query);
      if (!query) throw new Error('Please provide category.');

      let images = imageBatch;

      if (images.length === 0) {
        images = await fetchNewBatch(query);
        setImageBatch(images);
      }

      const randomIndex = Math.floor(Math.random() * images.length);
      const selectedImage = images[randomIndex];

      const newBatch = [...images];
      newBatch.splice(randomIndex, 1);
      setImageBatch(newBatch);

      setTempDummyImage(selectedImage);
      console.log('Selected dummy image:', selectedImage);
    } catch (error) {
      setGenerationError(error.message);
      setTempDummyImage({
        url: `https://placehold.co/800x1000?text=${encodeURIComponent(error.message)}`,
        alt_text: "Error generating image."
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleAddDummyImage = async () => {
    if (!productId && tempDummyImage) {
      onImagesUpdate([tempDummyImage]);
      return;
    }
    if (!tempDummyImage) return;
    if (productId && tempDummyImage) {
      try {
        await axios.post(`${VITE_API_URL}/products/${productId}/images`, {
          url: tempDummyImage.url,
          alt_text: tempDummyImage.alt_text
        });

        onImagesUpdate([...productImages, tempDummyImage]);
        await generateDummyImage();
      } catch (error) {
        console.error('Error adding dummy image:', error);
        alert("Eroare la adăugarea imaginii!");
      }
    }
  };

  const handleDeleteImage = (imageUrl) => {
    const updatedImages = productImages.filter(img => img.url !== imageUrl);
    onImagesUpdate(updatedImages);

    // Delete the temp dummy image if it matches the one being removed
    if (tempDummyImage && tempDummyImage.url === imageUrl) {
      setTempDummyImage(null);
    }
  };


  const handleFileUpload = async () => {

    if (!selectedFile) return;

    const reader = new FileReader();

    if (!productId) {
      // If no productId, treat as a new image upload
      reader.onloadend = () => {
        onImagesUpdate([{
          data_url: reader.result,
          alt_text: selectedFile.name,
          rawFile: selectedFile
        }]);
        setSelectedFile(null);
      };
      reader.readAsDataURL(selectedFile);
      return;
    }

    try {
      setIsUploading(true);
      setUploadError(null);

      const formDataToSend = new FormData();
      formDataToSend.append('image', selectedFile);

      const response = await axios.put(
        `${VITE_API_URL}/products/${productId}/images`,
        formDataToSend,
        { headers: { 'Content-Type': 'multipart/form-data' } }
      );

      onImagesUpdate([...productImages, {
        url: response.data.url,
        alt_text: selectedFile.name,
        is_main: true
      }]);
      setSelectedFile(null);

    } catch (error) {
      setUploadError(error.message);
    } finally {
      setIsUploading(false);
    }
  };

  const handleSetMainImage = async (image) => {
    try {
      await axios.put(`${VITE_API_URL}/products/${productId}/images/set-main`, {
        imageUrl: image.url,
      });
      
      // Update the productImages state to reflect the main image change
      const updatedImages = productImages.map(img => ({
        ...img,
        is_main: img.url === image.url
      }));

      onImagesUpdate(updatedImages);
    } catch (error) {
      console.error('Failed to set main image', error);
    }
  };

  return (
    <div className="image-uploader-container">
      <div className="controls">
        <input 
          type="file"
          onChange={(e) => setSelectedFile(e.target.files[0])}
          disabled={!canAddImage}
        />
        
        <button onClick={generateDummyImage} disabled={isGenerating || !canAddImage}>
          {isGenerating ? 'Generating...' : 'Generate Dummy'}
        </button>
        
        {canShowAddButton && (
          <button onClick={handleAddDummyImage}>
            Add to Product
          </button>
        )}

        {selectedFile && canAddImage && (
          <button onClick={handleFileUpload} disabled={isUploading}>
            {isUploading ? 'Uploading...' : 'Upload File'}
          </button>
        )}
      </div>
      
      {tempDummyImage && (
        <div className="preview" style={{ width: '320px', height: '400px', overflow: 'hidden' }}>
          <img 
            src={tempDummyImage.url} 
            alt={tempDummyImage.alt_text}
            style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '8px' }}
          />
        </div>
      )}

      {productImages.length > 0 && (
        <div className="image-list" style={{ marginTop: '1rem' }}>
          {productImages.map((image, idx) => (
            <div key={idx} style={{ display: 'flex', alignItems: 'center', marginBottom: '0.5rem' }}>
              <img
                src={image.url}
                alt={image.alt_text}
                style={{ width: '100px', height: '120px', objectFit: 'cover', borderRadius: '8px', marginRight: '0.5rem' }}
              />
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>

                {productImages.length > 1 && (
                  <button
                  onClick={() => handleSetMainImage(image)}
                  disabled={image.is_main}
                >
                  {image.is_main ? 'Main Image ' : 'Set as Main'}
                </button>
                )}

                <button onClick={() => handleDeleteImage(image.url)} style={{ color: 'red' }}>
                  Remove Image
                </button>

              </div>
            </div>
          ))}
        </div>
      )}
      
      {generationError && <p className="error">{generationError}</p>}
      {uploadError && <p className="error">{uploadError}</p>}
    </div>
  );
};

ImageUploader.propTypes = {
  productId: PropTypes.string,
  formData: PropTypes.object.isRequired,
  productImages: PropTypes.array.isRequired,
  onImagesUpdate: PropTypes.func.isRequired,
};

export default ImageUploader;
